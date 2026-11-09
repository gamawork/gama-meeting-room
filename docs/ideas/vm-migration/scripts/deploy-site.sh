#!/usr/bin/env bash
# 把網站部署到 VM（W-1106-vm-migration）。部署流程（使用者 2026-11-09：push 後手動部署）：
#   commit → git push main → 在本機 repo 根目錄用 Git Bash 執行：
#   bash docs/ideas/vm-migration/scripts/deploy-site.sh [--prod] [--allow-unpushed]
# 參數：
#   --prod            正式模式：不加「【VM 測試站】」字樣（正式切換後用）；不加則是測試站模式。
#   --allow-unpushed  跳過「HEAD 必須等於 origin/main」的檢查（只給測試用）。
# - 預設只部署已 push 的版本：HEAD 與 origin/main 不同就停，避免 VM 跑的是 GitHub 沒有的程式碼。
# - 只部署已 commit 的 index.html 與 gama.ico（git archive HEAD），工作目錄的未 commit 改動不會上去。
# - repo 的 index.html 一律保持指向雲端（push main 就是正式站）；部署到 VM 時才把
#   SUPABASE_URL 換成 window.location.origin（網頁與 API 同網址，由 nginx 轉給地端 API，見 nginx-site.conf）、
#   SUPABASE_ANON_KEY 換成地端金鑰（從 VM 的 ~/supabase-project/.env 讀，不經過本機）。
# - nginx 設定取 HEAD 的 nginx-site.conf，放 VM 的 ~/site-conf/default.conf；每次部署都重建 gama-site 容器。
# - supabase-js 部署時從 unpkg 下載（核對 sha256）放 VM 的 vendor/，頁面改從 VM 載入，不再依賴 unpkg。
# - 測試站模式（預設）：分頁標題與頁首前加「【VM 測試站】」（<title> 與 i18n 的 app.title），避免同事以為是正式站；--prod 不加。
# - version.txt 兩行：第一行 commit 短 hash，第二行模式（test／prod）。
# - 網站由 VM 上的 nginx 容器（gama-site，port 80）提供，重開機自動起來。
# 整個部署只開一條 ssh（之前短時間連太多條被擋過，見 README「VM 現況」）。
set -euo pipefail

VM=gama@10.10.2.96
KEY="$HOME/.ssh/id_ed25519_gama_vm"
LOCAL_SUPABASE_URL=http://10.10.2.96:8000   # 只給部署後檢查直連 API 用；網頁本身走同網址

cd "$(git rev-parse --show-toplevel)"

MODE=test; ALLOW_UNPUSHED=0
for arg in "$@"; do
  case "$arg" in
    --prod) MODE=prod ;;
    --allow-unpushed) ALLOW_UNPUSHED=1 ;;
    *) echo "用法：bash $0 [--prod] [--allow-unpushed]"; echo "  --prod            正式模式（不加【VM 測試站】字樣）"; echo "  --allow-unpushed  跳過 push 檢查（只給測試用）"; exit 1 ;;
  esac
done

# 只部署已 push 的版本（必須在任何 ssh 之前）
if [ "$ALLOW_UNPUSHED" = 0 ]; then
  git fetch origin main --quiet
  if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
    echo "停止：HEAD（$(git rev-parse --short HEAD)）跟 origin/main（$(git rev-parse --short origin/main)）不同，先 push 再部署（測試時可加 --allow-unpushed）"
    exit 1
  fi
fi

if ! git diff --quiet HEAD -- index.html gama.ico; then
  echo "注意：index.html 或 gama.ico 有未 commit 的改動，部署的是 HEAD（$(git rev-parse --short HEAD)）版本"
fi
REV=$(git rev-parse --short HEAD)

# 檔案用 base64 嵌進送到遠端的腳本，腳本與檔案走同一條 ssh 的 stdin
TAR_B64=$(git archive --format=tar HEAD index.html gama.ico | base64 -w0)
CONF_B64=$(git show HEAD:docs/ideas/vm-migration/scripts/nginx-site.conf | base64 -w0)

# supabase-js 改由 VM 提供，不從 unpkg 載入（使用者 2026-11-09）。版本與指紋寫死：
# index.html 換版本時這裡一起改，下載到的檔指紋不符就停。
SDK_URL=https://unpkg.com/@supabase/supabase-js@2.39.0/dist/umd/supabase.js
SDK_FILE=vendor/supabase-js-2.39.0.js
SDK_SHA256=e445c2e8479bac47a44867ebf284250c6d1372dc85b2e7910c3f376e26921c54
HEAD_HTML=$(git show HEAD:index.html)   # 不直接接 grep -q：提早結束會讓 git show 收到 SIGPIPE，pipefail 下誤判失敗
grep -qF "src=\"$SDK_URL\"" <<< "$HEAD_HTML" || { echo "停止：HEAD 的 index.html 找不到 $SDK_URL（換版本了？請更新本腳本的 SDK_*）"; exit 1; }
SDK_B64=$(curl -fsSL --max-time 60 "$SDK_URL" | base64 -w0)
[ "$(printf '%s' "$SDK_B64" | base64 -d | sha256sum | cut -d' ' -f1)" = "$SDK_SHA256" ] || { echo "停止：下載的 supabase-js 指紋不符"; exit 1; }

{ echo "REV='$REV'; MODE='$MODE'; LOCAL_SUPABASE_URL='$LOCAL_SUPABASE_URL'; TAR_B64='$TAR_B64'; CONF_B64='$CONF_B64'; SDK_B64='$SDK_B64'; SDK_URL='$SDK_URL'; SDK_FILE='$SDK_FILE'; SDK_SHA256='$SDK_SHA256'"; cat <<'REMOTE'
set -euo pipefail
NEW="$HOME/site-new"; LIVE="$HOME/site"
rm -rf "$NEW"; mkdir -p "$NEW"
printf '%s' "$TAR_B64" | base64 -d | tar xf - -C "$NEW"; unset TAR_B64
mkdir -p "$NEW/vendor"
printf '%s' "$SDK_B64" | base64 -d > "$NEW/$SDK_FILE"; unset SDK_B64
[ "$(sha256sum "$NEW/$SDK_FILE" | cut -d' ' -f1)" = "$SDK_SHA256" ] || { echo "停止：VM 上的 supabase-js 指紋不符"; exit 1; }

ANON_KEY=$(grep -E '^ANON_KEY=' "$HOME/supabase-project/.env" | cut -d= -f2-)
[ -n "$ANON_KEY" ] || { echo "停止：VM .env 讀不到 ANON_KEY"; exit 1; }

F="$NEW/index.html"
sed -i -E \
  -e "s|^([[:space:]]*const SUPABASE_URL = )'[^']*';|\1window.location.origin;|" \
  -e "s|^([[:space:]]*const SUPABASE_ANON_KEY = )'[^']*';|\1'$ANON_KEY';|" \
  -e "s|src=\"$SDK_URL\"|src=\"./$SDK_FILE\"|" \
  "$F"
if [ "$MODE" = test ]; then   # 測試站模式才加字樣；--prod 跳過
  sed -i -E \
    -e "0,/<title>/s|<title>|<title>【VM 測試站】|" \
    -e "s|'app.title': '|'app.title': '【VM 測試站】|" \
    "$F"
fi

# 替換一定要剛好命中，否則停（index.html 改過寫法時會在這裡發現，不會默默連到雲端）
[ "$(grep -c "const SUPABASE_URL = window.location.origin;" "$F")" = 1 ] || { echo "停止：SUPABASE_URL 替換失敗"; exit 1; }
[ "$(grep -c "const SUPABASE_ANON_KEY = '$ANON_KEY';" "$F")" = 1 ] || { echo "停止：SUPABASE_ANON_KEY 替換失敗"; exit 1; }
! grep -q 'supabase\.co' "$F" || { echo "停止：替換後仍有 supabase.co"; grep -n 'supabase\.co' "$F" | cut -c1-120; exit 1; }
if [ "$MODE" = test ]; then
  grep -q '<title>【VM 測試站】' "$F" || { echo "停止：標題沒加上測試站字樣"; exit 1; }
  # 載入後 document.title 與頁首 h1 改由 i18n 的 app.title（中、英各一）決定，兩處都要加
  [ "$(grep -c "'app.title': '【VM 測試站】" "$F")" = 2 ] || { echo "停止：i18n app.title 沒有剛好 2 處加上測試站字樣"; exit 1; }
fi
[ "$(grep -c "src=\"./$SDK_FILE\"" "$F")" = 1 ] || { echo "停止：supabase-js 載入網址沒換成 VM 上的檔案"; exit 1; }
! grep -q 'unpkg\.com' "$F" || { echo "停止：替換後仍有 unpkg.com"; exit 1; }
printf '%s\n%s\n' "$REV" "$MODE" > "$NEW/version.txt"
chmod -R a+rX "$NEW"

# nginx 設定：先用暫存容器檢查語法，通過才換上（設定錯就停，舊站照跑）
CONF_DIR="$HOME/site-conf"; mkdir -p "$CONF_DIR"
printf '%s' "$CONF_B64" | base64 -d > "$CONF_DIR/default.conf.new"; unset CONF_B64
chmod a+r "$CONF_DIR/default.conf.new"
docker run --rm --add-host=host.docker.internal:host-gateway \
  -v "$CONF_DIR/default.conf.new":/etc/nginx/conf.d/default.conf:ro nginx:alpine nginx -t -q \
  || { echo "停止：nginx 設定檢查沒過"; exit 1; }
mv "$CONF_DIR/default.conf.new" "$CONF_DIR/default.conf"

# 換上新版：舊的留一份 site-prev
rm -rf "$HOME/site-prev"; [ -d "$LIVE" ] && mv "$LIVE" "$HOME/site-prev"; mv "$NEW" "$LIVE"

# 每次都重建容器：目錄換了 bind mount 要重掛，設定檔與 host.docker.internal 也要帶上（退回上一版仍可用 docker restart）
docker rm -f gama-site > /dev/null 2>&1 || true
docker run -d --name gama-site --restart unless-stopped -p 80:80 \
  --add-host=host.docker.internal:host-gateway \
  -v "$LIVE":/usr/share/nginx/html:ro \
  -v "$CONF_DIR/default.conf":/etc/nginx/conf.d/default.conf:ro nginx:alpine > /dev/null

sleep 2
echo "部署版本（第一行 commit、第二行模式）："; curl -fsS http://localhost/version.txt
echo "supabase-js 由 VM 提供（應回 200）：$(curl -s -o /dev/null -w '%{http_code}' "http://localhost/$SDK_FILE")"
curl -fsS http://localhost/ | grep -o '<title>[^<]*</title>'
echo "同網址讀 bookings（經 nginx 轉給 API，應回 200）：$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" "http://localhost/rest/v1/bookings?select=id&limit=1")"
echo "同網址即時同步 WebSocket（應回 101）：$(curl -s -o /dev/null -m 3 -w '%{http_code}' --http1.1 -H 'Connection: Upgrade' -H 'Upgrade: websocket' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' "http://localhost/realtime/v1/websocket?apikey=$ANON_KEY&vsn=1.0.0" || true)"
echo "直連 API 8000 仍可用（應回 200）：$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" "$LOCAL_SUPABASE_URL/rest/v1/bookings?select=id&limit=1")"
REMOTE
} | ssh -i "$KEY" -o ConnectTimeout=10 -o BatchMode=yes "$VM" bash -s
