# DaiNaoSanGuo (呆脑三国)

A portrait Three Kingdoms auto-battler built with Cocos Creator 3.8.8 and TypeScript. The game includes recruitable officers, formations, equipment, signature weapons, and four battle activities. Play and progression run locally. The backend in `server/` is a read-only prototype.

Current source: **0.15.2 (r15e)**. See the changelog for release status.

[中文说明](README.zh-CN.md) · [English changelog](CHANGELOG.md) · [Game specification](SPEC.md)

## Run the project

Install Cocos Creator 3.8.8 and Node.js 22.18 or newer. Run `npm run preview:prepare`, open this directory in Creator, and preview `assets/Battle.scene`. The preview uses a portrait frame. The development and experience profiles start with background music off.

```sh
npm test
npm run typecheck
npm run build:web
npm run build:wechat
```

Creator generates the type declarations on first open. Close the project editor before running the build commands.

The tracked WeChat build config uses the official test AppID. To build for your own account, copy `build-configs/wechatgame.json` to `build-configs/wechatgame.local.json` and replace the AppID there. The local file is ignored. Run `npm run check:wechat` before using the WeChat developer tools to upload. Uploading requires access to your own account.

## Project assets

The four battle backgrounds were generated for this game. The music and effects are synthesized by `scripts/compose-audio.py`. The Cocos editor and engine are separate dependencies with their own terms. Account-specific build settings, previous preview QR codes, and branding exports are kept outside this repository.

## License

Project source code is available under the [MIT License](LICENSE). The game artwork, music, and sound recordings remain under their original copyright. See [Asset rights](ASSET_RIGHTS.md) for the scope.
