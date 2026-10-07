# gamemine

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Remixed using [OMGithub.com](https://omgithub.com).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://omgithub.com/asena0dkd-lgtm/gamemine)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/asena0dkd-lgtm/gamemine)

- 🎮 [Open the project](https://omgithub.com/asena0dkd-lgtm/gamemine).
- ✨ [Remix this project](https://omgithub.com/?remix=asena0dkd-lgtm%2Fgamemine).
- 💻 [Explore the source](https://github.com/asena0dkd-lgtm/gamemine).
- 🛠️ [Check build runs](https://github.com/asena0dkd-lgtm/gamemine/actions).
- 🐛 [Report an issue](https://github.com/asena0dkd-lgtm/gamemine/issues).
- 👤 [Explore the creator's projects](https://omgithub.com/asena0dkd-lgtm).
- 🌍 [Create with OMGithub](https://omgithub.com).
- 🧬 [Explore the remix source](https://github.com/asena0dkd-lgtm/gamemine).
<!-- omgithub:readme:end -->

## 🛸 نجاة الكوكب الفضائي — لعبة مربعات 2.5D للهاتف

لعبة نجاة boxy بكوكب فضائي: سفينة محطمة فيها أكسجين، فواكه غريبة، وحوش مربعة، انفنتوري مثل ماين كرافت، ونظام خفة (فقط ما تراه الشاشة يُرسم — عدّاد 👁️ أعلى الشاشة).

- ▶️ التشغيل محلياً: `python3 -m http.server 3002` ثم افتح `http://localhost:3002` (أفقي 16:9)
- 🎮 تحكم: عصا لمس + أزرار (قفز/جمع/أكل/O₂) — كيبورد: WASD + مسافة + E/Q/O
- 📦 الملفات: `index.html` + `css/style.css` + `js/game.js` + `libs/three.module.min.js` (يعمل أوفلاين داخل APK)
- 🤖 APK عبر GitHub: ادفع إلى `main` — وركفلو `.github/workflows/build-apk.yml` يبني `space-survival-boxy.apk` (Capacitor + Gradle assembleDebug) ويرفعه كـ Artifact. حمّله من تبويب Actions وثبّته على هاتفك.
- 📲 يدوياً: `npm install && npx cap add android && npx cap sync android && cd android && ./gradlew assembleDebug`
