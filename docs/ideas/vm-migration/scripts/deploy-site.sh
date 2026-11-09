#!/usr/bin/env bash
# 把網站部署到 VM 測試站（W-1106-vm-migration 驗收 6）。在本機 repo 根目錄用 Git Bash 執行：
#   bash docs/ideas/vm-migration/scripts/deploy-site.sh
# - 只部署已 commit 的 index.html 與 gama.ico（git archive HEAD），工作目錄的未 commit 改動不會上去。
# - repo 的 index.html 一律保持指向雲端（push main 就是正式站）；部署到 VM 時才把
#   SUPABASE_URL／SUPABASE_ANON_KEY 換成地端，金鑰從 VM 的 ~/supabase-project/.env 讀，不經過本機。
# - 分頁標題與頁首前加「【VM 測試站】」（<title> 與 i18n 的 app.title），避免同事以為是正式站。
# - 網站由 VM 上的 nginx 容器（gama-site，port 80）提供，重開機自動起來。
# 整個部署只開一條 ssh（之前短時間連太多條被擋過，見 README「VM 現況」）。
set -euo pipefail

VM=gama@10.10.2.96
KEY="$HOME/.ssh/id_ed25519_gama_vm"
LOCAL_SUPABASE_URL=http://10.10.2.96:8000

cd "$(git rev-parse --show-toplevel)"
if ! git diff --quiet HEAD -- index.html gama.ico; then
  echo "注意：index.html 或 gama.ico 有未 commit 的改動，部署的是 HEAD（$(git rev-parse --short HEAD)）版本"
fi
REV=$(git rev-parse --short HEAD)

# 檔案用 base64 嵌進送到遠端的腳本，腳本與檔案走同一條 ssh 的 stdin
TAR_B64=$(git archive --format=tar HEAD index.html gama.ico | base64 -w0)

{ echo "REV='$REV'; LOCAL_SUPABASE_URL='$LOCAL_SUPABASE_URL'; TAR_B64='$TAR_B64'"; cat <<'REMOTE'
set -euo pipefail
NEW="$HOME/site-new"; LIVE="$HOME/site"
rm -rf "$NEW"; mkdir -p "$NEW"
printf '%s' "$TAR_B64" | base64 -d | tar xf - -C "$NEW"; unset TAR_B64

ANON_KEY=$(grep -E '^ANON_KEY=' "$HOME/supabase-project/.env" | cut -d= -f2-)
[ -n "$ANON_KEY" ] || { echo "停止：VM .env 讀不到 ANON_KEY"; exit 1; }

F="$NEW/index.html"
sed -i -E \
  -e "s|^([[:space:]]*const SUPABASE_URL = )'[^']*';|\1'$LOCAL_SUPABASE_URL';|" \
  -e "s|^([[:space:]]*const SUPABASE_ANON_KEY = )'[^']*';|\1'$ANON_KEY';|" \
  -e "0,/<title>/s|<title>|<title>【VM 測試站】|" \
  -e "s|'app.title': '|'app.title': '【VM 測試站】|" \
  "$F"

# 替換一定要剛好命中，否則停（index.html 改過寫法時會在這裡發現，不會默默連到雲端）
[ "$(grep -c "const SUPABASE_URL = '$LOCAL_SUPABASE_URL';" "$F")" = 1 ] || { echo "停止：SUPABASE_URL 替換失敗"; exit 1; }
[ "$(grep -c "const SUPABASE_ANON_KEY = '$ANON_KEY';" "$F")" = 1 ] || { echo "停止：SUPABASE_ANON_KEY 替換失敗"; exit 1; }
! grep -q 'supabase\.co' "$F" || { echo "停止：替換後仍有 supabase.co"; grep -n 'supabase\.co' "$F" | cut -c1-120; exit 1; }
grep -q '<title>【VM 測試站】' "$F" || { echo "停止：標題沒加上測試站字樣"; exit 1; }
# 載入後 document.title 與頁首 h1 改由 i18n 的 app.title（中、英各一）決定，兩處都要加
[ "$(grep -c "'app.title': '【VM 測試站】" "$F")" = 2 ] || { echo "停止：i18n app.title 沒有剛好 2 處加上測試站字樣"; exit 1; }
echo "$REV" > "$NEW/version.txt"
chmod -R a+rX "$NEW"

# 換上新版：舊的留一份 site-prev
rm -rf "$HOME/site-prev"; [ -d "$LIVE" ] && mv "$LIVE" "$HOME/site-prev"; mv "$NEW" "$LIVE"

if ! docker ps -a --format '{{.Names}}' | grep -qx gama-site; then
  docker run -d --name gama-site --restart unless-stopped -p 80:80 \
    -v "$LIVE":/usr/share/nginx/html:ro nginx:alpine > /dev/null
else
  docker restart gama-site > /dev/null   # 目錄換了，bind mount 要重掛
fi

sleep 2
echo "部署版本：$(curl -fsS http://localhost/version.txt)"
curl -fsS http://localhost/ | grep -o '<title>[^<]*</title>'
echo "地端 API 用公開金鑰讀 bookings（應回 200）：$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" "$LOCAL_SUPABASE_URL/rest/v1/bookings?select=id&limit=1")"
echo "CORS 預檢（應回 Access-Control-Allow-Origin）："
curl -s -o /dev/null -D - -X OPTIONS -H 'Origin: http://10.10.2.96' -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: apikey,authorization' "$LOCAL_SUPABASE_URL/rest/v1/bookings" | grep -i '^access-control-allow-origin' || echo "（沒有 CORS 標頭）"
REMOTE
} | ssh -i "$KEY" -o ConnectTimeout=10 -o BatchMode=yes "$VM" bash -s
