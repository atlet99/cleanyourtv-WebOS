#!/bin/sh
# CleanYourTV for LG webOS: installs the manager app only. Run ON the TV, as root (see the README and https://atlet99.github.io/cleanyourtv-WebOS/install/). It downloads the latest
# release package (an .ipk), checks its SHA-256 and installs it. The setup itself (replacing LG's Home, the Input key,
# the debloat) is done afterwards in the CleanYourTV app on the TV: open it and choose "Set up now".
#
#   Copy the reviewed installer and the fork's trusted public key to the TV, then run it locally.
#
# Environment: CYTV_REPO=owner/name (default atlet99/cleanyourtv-WebOS)  CYTV_IPK=/path/to/package.ipk (use a local package)
#   CYTV_BRANCH=<branch>  install the test build of that branch (a pre-release test-<branch>) and keep following it; the manager app
#   can switch back to the stable releases (Update channel)

main() {
  REPO="${CYTV_REPO:-atlet99/cleanyourtv-WebOS}"
  ID=com.cleanyourtv.manager
  PAYLOAD=/media/developer/apps/usr/palm/applications/$ID/root
  export PATH=/usr/bin:/usr/sbin:/bin:/sbin:$PATH
  say() { echo "[cleanyourtv] $*"; }
  # Never follow an HTTPS release asset redirect to plain HTTP.
  curl() { command curl --proto '=https' --proto-redir '=https' "$@"; }
  die() { echo "[cleanyourtv] ERROR: $*" >&2; exit 1; }
  case "$1" in -h|--help) sed -n '2,8p' "$0" 2>/dev/null | sed 's/^# \{0,1\}//'; return 0 ;; "") ;; *) die "unknown option: $1" ;; esac

  [ "$(id -u)" = 0 ] || die "run as root (ssh root@<tv-ip>)"
  command -v luna-send >/dev/null || die "this does not look like webOS (no luna-send)"
  [ -d /var/lib/webosbrew/init.d ] || die "/var/lib/webosbrew/init.d not found: root with the Homebrew Channel is required (https://rootmy.tv)"
  for t in curl node; do command -v $t >/dev/null || die "missing tool: $t"; done

  command -v systemctl >/dev/null && node -e '(()=>1)()' >/dev/null 2>&1 || die "this TV is too old (webOS 4 or earlier: no systemd, old Node.js). CleanYourTV needs webOS 5 or newer."
  T=$(mktemp -d /tmp/cytv.XXXXXX) || die "mktemp failed"
  trap 'rm -rf "$T"' EXIT
  if [ -n "$CYTV_IPK" ]; then
    [ -f "$CYTV_IPK" ] || die "$CYTV_IPK not found"
    IPK="$CYTV_IPK"
  else
    API="https://api.github.com/repos/$REPO/releases/latest"
    if [ -n "$CYTV_BRANCH" ]; then
      SLUG=$(printf '%s' "$CYTV_BRANCH" | tr 'A-Z' 'a-z' | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' | cut -c1-60)
      [ -n "$SLUG" ] || die "CYTV_BRANCH is not a usable branch name"
      API="https://api.github.com/repos/$REPO/releases/tags/test-$SLUG"
      say "looking for the test build of the branch $CYTV_BRANCH in $REPO"
    else
      say "looking for the latest release of $REPO"
    fi
    curl -fsSL -H 'User-Agent: cleanyourtv-installer' "$API" > $T/release.json || die "could not read the release list (is there a release yet? for a branch: has its build finished?)"
    KEY="${CYTV_RELEASE_KEY:-/media/developer/cleanyourtv/release-public.pem}"
    [ -f "$KEY" ] || die "no trusted release key: copy the maintainer's public key to $KEY first (CYTV_RELEASE_KEY can select a trusted local file)"
    node -e 'var j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")),a={};(j.assets||[]).forEach(function(x){a[x.name]=x.browser_download_url});var k=Object.keys(a).filter(function(n){return /^com\.cleanyourtv\.manager_\d+\.\d+\.\d+_all\.ipk$/.test(n)&&a[n+".sha256"]&&a[n+".sha256.sig"]})[0];if(!k)process.exit(1);console.log(a[k]);console.log(a[k+".sha256"]);console.log(a[k+".sha256.sig"]);console.log(k)' $T/release.json > $T/assets.txt || die "the release has no signed package"
    IPKURL=$(sed -n 1p $T/assets.txt); SHAURL=$(sed -n 2p $T/assets.txt); SIGURL=$(sed -n 3p $T/assets.txt); NAME=$(sed -n 4p $T/assets.txt)
    say "downloading $(basename "$IPKURL")"
    curl -fsSL "$IPKURL" -o $T/pkg.ipk || die "download failed"
    curl -fsSL "$SHAURL" -o "$T/checksum" || die "checksum download failed"
    curl -fsSL "$SIGURL" -o "$T/signature" || die "signature download failed"
    want=$(node -e 'var fs=require("fs"),c=require("crypto"),a=process.argv.slice(1),b=fs.readFileSync(a[0]),v=c.createVerify("RSA-SHA256");v.update(b);if(!v.verify(fs.readFileSync(a[2]),fs.readFileSync(a[1])))process.exit(1);var m=/^([0-9a-f]{64})  ([^\r\n]+)\n?$/.exec(b.toString());if(!m||m[2]!==a[3])process.exit(1);console.log(m[1])' "$T/checksum" "$T/signature" "$KEY" "$NAME") || die "release signature is not valid; nothing was installed"
    got=$(node -e 'console.log(require("crypto").createHash("sha256").update(require("fs").readFileSync(process.argv[1])).digest("hex"))' $T/pkg.ipk)
    [ -n "$want" ] && [ "$want" = "$got" ] || die "the package does not match its checksum; nothing was installed"
    IPK=$T/pkg.ipk
  fi

  # right after a system app manager restart an install can be silently dropped, so check and retry
  cp "$IPK" "$T/install.ipk" || die "could not stage package"
  n=0; ok=0
  while [ $n -lt 4 ]; do
    luna-send -n 1 -w 30000 -f luna://com.webos.appInstallService/dev/install "{\"id\":\"$ID\",\"ipkUrl\":\"$T/install.ipk\",\"subscribe\":false}" </dev/null >/dev/null 2>&1
    for i in 1 2 3 4 5 6 7 8; do
      sleep 3
      [ -f "$PAYLOAD/bootstrap.sh" ] && luna-send -n 1 -w 5000 -f luna://com.webos.applicationManager/getAppInfo "{\"id\":\"$ID\"}" </dev/null 2>/dev/null | grep -q '"returnValue": true' && { ok=1; break; }
    done
    [ $ok = 1 ] && break
    n=$((n+1))
  done
  rm -f "$T/install.ipk"
  [ $ok = 1 ] || die "the package did not install (see Troubleshooting in the documentation: https://atlet99.github.io/cleanyourtv-WebOS/troubleshooting/)"
  if [ -n "$SLUG" ]; then mkdir -p /media/developer/cleanyourtv && echo "test-$SLUG" > /media/developer/cleanyourtv/channel; say "the manager app now follows the test builds of $CYTV_BRANCH (Update channel in the manager switches back to the stable releases)."; fi
  say "the CleanYourTV app is installed."
  if [ -f /media/developer/cleanyourtv/helper.js ] && [ -e /var/lib/webosbrew/init.d/10-cleanyourtv-home ]; then
    # already set up: this is an update, so bring the running service to the new version
    sh "$PAYLOAD/bootstrap.sh" update "$(sed -n "s/^const VERSION = '\(.*\)';/\1/p" "$PAYLOAD/helper/helper.js" | head -1)"
  else
    say "Next, on the TV: open CleanYourTV in the app list and choose 'Set up now'."
  fi
}
main "$@"
