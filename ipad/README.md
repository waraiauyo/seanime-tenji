# iPad build

Personal branch of [Seanime Tenji](https://github.com/5rahim/seanime-tenji) with fixes for iPad,
built and installed straight from Xcode with a paid Apple developer account.

## Changes on top of upstream

- The status bar hides in the player and the manga reader on iPadOS
  ([#49](https://github.com/5rahim/seanime-tenji/issues/49)).
- `patches/`: react-native-screens keeps the status bar text adaptive (light or dark depending
  on the content behind it) on screens that don't set an explicit style.
- The floating bars (main tab bar, anime and manga entry switchers) use the iOS 26+ Liquid Glass
  material, through the shared `src/components/shared/glass-bar.tsx`. Other platforms keep the
  solid bar. On the glass, unselected icons are brighter than the default gray so they stay
  readable.
- Torrent streams keep a release search query typed in smart search instead of replacing it
  with the show's title (from the open upstream
  [pull request #44](https://github.com/5rahim/seanime-tenji/pull/44)). Drop this change if
  upstream merges it.
- `package-lock.json` pins the dependency versions Tenji v0.4.0 was released with.

## Build and install

Connect the iPad to the Mac, then:

```bash
./ipad/build.sh
```

It installs the dependencies, applies `patches/`, generates the iOS project, builds in Release and
installs the app on the first paired iPad. For JavaScript-only changes, reuse the existing
dependencies and iOS project to build faster:

```bash
SKIP_DEPS=1 SKIP_PREBUILD=1 ./ipad/build.sh
```

The app stays valid until the signing certificate expires (one year with a paid account).

Decline the in-app quick updates (OTA): they replace the app's code with the upstream version and
undo these changes.

## Updating to a new Tenji version

```bash
git fetch upstream
git rebase upstream/main
./ipad/build.sh
```

If a new release changes dependencies, regenerate the lockfile against its release date
(`npm install --before=<date>`) before building.
