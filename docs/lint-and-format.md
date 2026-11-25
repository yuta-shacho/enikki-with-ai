# Lint と整形

コードの検査と整形のルールをまとめる。検査には Oxlint、整形には Oxfmt を使う。どちらも Vite+ に入っていて、`vp check` で一度に走らせる。手元の環境は [開発環境と起動手順](dev-environment.md)、コードの置き場所は [システム構成](architecture.md) に書いてある。

## 1. 設定を置く場所

lint と整形の設定はリポジトリのルートの `vite.config.ts` に1つだけ書く。

```ts
// vite.config.ts（ルート）
import cloudflare from "@cloudflare/oxlint-config";
import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ...cloudflare,
    rules: { ...cloudflare.rules /* 2章で足すルール */ },
    overrides: [...cloudflare.overrides /* ディレクトリごとのルール */],
  },
  fmt: { sortImports: true },
});
```

- ルートの `lint` と `fmt` の設定は `web/` と `cli/` の両方に当たる
- 一部のディレクトリやファイルだけに当てるルールは、`overrides` の `files` にパスを書いて分ける。パスはルートから書く（例：`web/src/server/domain/**`）
- `web/vite.config.ts` には `lint` と `fmt` を書かない。void と React の設定だけを置く
- Vite+ はパッケージやディレクトリの中に置いた lint と整形の設定を読まない。`web/` で `vp check` を打っても、ルートの設定が使われる
- カスタムルールはルートの `script/enikki.ts` に置く。ルールは `vite-plus/lint/plugins` で書き、`script/enikki.test.ts` で `vite-plus/lint/plugins-dev` の `RuleTester` を使ってテストする。ルートで `vp test` を打つと、このテストだけが走る（`test.include`）
- ルートの `package.json` には `vite-plus` と `@cloudflare/oxlint-config` だけを入れ、`typescript` は入れない。入れると、プリセットが使う ESLint のプラグインが求める TypeScript（6.1 未満）と合わず、pnpm が警告を出す。ルートの型チェックは、Vite+ に入っている tsrs がする

## 2. lint のルール

### 基本にするプリセット

[@cloudflare/oxlint-config](https://github.com/cloudflare/oxlint-config) のルールを基本にする。

- バージョンは `0.1.0` に固定し、`^` を付けない。2026-11-20 に公開されたばかりで、これからルールが変わりやすいためだ
- プリセットの `rules` と `overrides` は、展開してから書き足す。展開せずに書くと、プリセットの設定が消える
- 型の情報を使う検査（`typeAware`）と型チェック（`typeCheck`）を、どちらも有効にする。プリセットには、型の情報を使うルールが入っている。また、`vp check` で型チェックもすることは、[開発環境と起動手順](dev-environment.md) の4章で決めてある
- プリセットは oxlint `^1.94.0` を求める。そのため、Vite+ を 1.7.0 に上げた（#38）。1.7.0 には oxlint 1.94.0 が入っている
- プリセットは、oxlint が既定で有効にする correctness のカテゴリを切り（`categories: { correctness: "off" }`）、使うルールを1つずつ有効にしている。`no-unused-vars`、`no-undef`、`no-unreachable` などの correctness のルールも、この中で有効にしている。この方針をそのまま受け入れる。oxlint を上げても、カテゴリに足されたルールが知らないうちに有効にならず、検査の結果が変わりにくいためだ
- プリセットは、`no-console` をすべてのファイルで `error` にしている。要らなくなったルールの無効化コメントも、`reportUnusedDisableDirectives` で `error` にしている
- `vp migrate` が入れた `vite-plus/prefer-vite-plus-imports` も残す。`vite` や oxlint ではなく `vite-plus` から import するよう求めるルールだ
- テストのファイルには、プリセットの設定をそのまま使う。プリセットは `*.test.*` などのファイルで、型の安全さを確かめるルールの一部を外している

### 足すルール

主に `web/src/server/` についての決まりのうち、文書に書いてあって機械的に確かめられるものだけをルールにする。ルールはすべて `error` にする。

依存の向き

| #   | 決まり                                                                                                                                                                                                                                      | 当てる場所                                                             | 方法                    | 理由                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| 1   | `usecase/`、`adapter/`、`db/schema.ts`（別名の `@schema` を含む）と、D1 と Drizzle のモジュール（`void/db`、`void/schema-*`、`void/drizzle-*`、`drizzle-orm`）を import しない。`../adapter` のようにディレクトリを直接指す import も止める | `web/src/server/domain/**`                                             | `no-restricted-imports` | [システム構成](architecture.md) の2章の不変条件                                      |
| 2   | `void/db` を import しない                                                                                                                                                                                                                  | `web/` のうち、`web/src/server/adapter/**` と `web/db/**` を除くところ | `no-restricted-imports` | D1 を読み書きするのは `adapter/` だけにする（[システム構成](architecture.md) の2章） |
| 3   | import を循環させない                                                                                                                                                                                                                       | `web/src/server/**`                                                    | `import/no-cycle`       | kamae。寄せ集めのファイルは import の循環の原因になる                                |

置き場所

| #   | 決まり                                                                                                                      | 当てる場所          | 方法           | 理由                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------- | --------------------------------------------------------- |
| 4   | `web/src/server/` の中に `port/` や `ports/` というディレクトリを作らない。チェックアウト先の親のディレクトリの名前は見ない | `web/src/server/**` | カスタムルール | kamae。読み書きの型は、それを使うドメインの概念の隣に置く |
| 5   | `types.ts`、`models.ts`、`domain.ts` のような寄せ集めのファイルを作らない                                                   | `web/src/server/**` | カスタムルール | kamae。1つのファイルには1つの概念を置く                   |
| 6   | `index.ts` には re-export だけを書く                                                                                        | `web/src/server/**` | カスタムルール | kamae                                                     |

書き方

| #   | 決まり                                   | 当てる場所                 | 方法                                     | 理由                                                                  |
| --- | ---------------------------------------- | -------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| 7   | 型は `interface` ではなく `type` で書く  | `web/src/server/**`        | `typescript/consistent-type-definitions` | kamae。`interface` は同じ名前で宣言し直すと、知らないうちに形が変わる |
| 8   | 型の中の関数は、プロパティの書き方にする | `web/src/server/**`        | `typescript/method-signature-style`      | kamae。メソッドの書き方では、引数の型の確かめが緩くなる               |
| 9   | `as` は `as const` の形でしか使わない    | `web/src/server/**`        | `typescript/consistent-type-assertions`  | kamae。外から来た値は、`as` ではなく schema で確かめる                |
| 10  | `class` を使わない                       | `web/src/server/domain/**` | カスタムルール                           | kamae。状態は判別可能なユニオン型で表す                               |

- `switch` の場合分けの漏れは、プリセットの `typescript/switch-exhaustiveness-check` が確かめる
- 10番をカスタムルールにするのは、oxlint には構文を指定して禁止する `no-restricted-syntax` がないためだ
- 同じファイルに2つの `overrides` が当たったときは、配列の後ろに書いたほうが使われる。2番は `web/**` に当てたあと、`adapter/` と `web/db/` で外している

### 例外

| ファイル                    | 外すルール | 理由                                                     | 外すのをやめるとき                                        |
| --------------------------- | ---------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `web/pages/index.server.ts` | 2番        | `void init` が作った見本で、`void/db` を import している | 見本の表を [DB の設計](db-design.md) の表に置き換えたとき |

### ルールにしないもの

当てはまるかどうかに判断が要るので、次の決まりはルールにしない。kamae-review で確かめる。

- 状態を判別するプロパティの名前を `kind` にそろえる
- ID に branded type を使う。個人情報に `Sensitive<T>` を使う
- 状態を判別可能なユニオン型で表す。ドメインの型に `Readonly<>` を付ける
- `for` の代わりに `filter` や `map` を使う
- resolver と store を、それぞれ1つの操作に分ける
- 失敗を例外で返すか、`Result` で返すかを分ける

文書に決まりがないので、次の依存の向きはまだルールにしない。

- `usecase/` から `adapter/` を import してよいか。adapter を作って usecase に渡す場所をどこにするかで決まる
- `adapter/` から `usecase/` を import してよいか
- `pages/` と `src/components/` から、`src/server/` のどこまでを import してよいか

## 3. 整形

Oxfmt の既定の設定を使い、import の並び替えだけを足す（`sortImports: true`）。

| 項目              | 設定                             |
| ----------------- | -------------------------------- |
| インデント        | スペース2つ                      |
| 引用符            | `"`                              |
| セミコロン        | 付ける                           |
| 1行の長さ         | 100文字                          |
| 末尾のカンマ      | 付けられるところにはすべて付ける |
| import の並び替え | する                             |

- import の並び替えは自動で直るので、入れても手間は増えない
- Oxfmt は TypeScript のほかに、Markdown、JSON、CSS も整形する

## 4. 検査と整形の対象

リポジトリ全体を対象にし、次の場所だけを lint と整形の両方から外す。

| 場所                      | 外す理由                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/skills/`         | kamae と kamae-review は、外のリポジトリ（kamae-ts の v1.4.0）から持ってきたものだ。書き換えると、元のリポジトリから更新を取り込みにくくなる |
| `web/db/migrations/`      | `void db generate` が作る                                                                                                                    |
| `web/AGENTS.md`           | void が書き込む                                                                                                                              |
| `docs/diagrams/`          | 図を作る道具が書き出す                                                                                                                       |
| `.github/ISSUE_TEMPLATE/` | 整形すると、`- [ ] ` の後ろの空白が消える。GitHub で空のチェックボックスとして表示されなくなるかもしれない                                   |

- `docs/*.md` は整形の対象にする。いまの文書で変わるのは、表の列の幅だけだ
- lint も整形も、`.gitignore` に書いたもの（`node_modules/`、`web/.void/` など）は見ない

## 5. ルールを無効にするコメント

ルールを外すコメントは、次の行だけを外す形でしか書かない。ルール名と理由を必ず書く。

```ts
// oxlint-disable-next-line typescript/no-non-null-assertion -- 直前の has で、値があることを確かめている
```

- ルール名を書かずにすべてのルールを外すコメントと、ファイル全体を外すコメントは使わない。外す範囲を1行に絞れば、レビューで目に留まる
- kamae も原則から外れるときは、理由をコメントに書くよう求めている
- 要らなくなったコメントは、プリセットが有効にしている `reportUnusedDisableDirectives` で見つける
- ルール名と理由を書いているかは、レビューで確かめる。oxlint の組み込みのルールでは確かめられない

## 6. 自動修正

安全な修正だけを許す。

- 使うのは `vp check --fix` と、VS Code で手で保存したときの修正だ。どちらも整形と安全な修正だけをする
- `--fix-suggestions` と `--fix-dangerously` は使わない。oxlint の説明では、この2つはプログラムの動きを変えることがある
- いまある違反は、設定を入れる PR で一度に直す。いまのコードは `void init` が作った数ファイルだけだからだ。例外は2章の表のファイルだけにする

## 7. 実行のしかた

| すること                         | コマンド                   | 打つ場所 |
| -------------------------------- | -------------------------- | -------- |
| 整形、lint、型チェックで確かめる | `vp check --deny-warnings` | ルート   |
| 整形し、安全な修正をかける       | `vp check --fix`           | ルート   |
| カスタムルールのテスト           | `vp test`                  | ルート   |

- 手元でも CI でも、確かめるときは同じコマンドを打つ。手元で通ったものが CI で落ちることを減らすためだ（[開発環境と起動手順](dev-environment.md) の4章）
- ルールはすべて `error` にし、`warn` のルールは作らない。警告が出ても検査が落ちないようにしておくと、警告は放っておかれやすい。そこで `--deny-warnings` を付け、警告が出たときも検査が落ちるようにする

### VS Code

保存したときに整形されるように、Vite+ の文書（`docs/guide/ide-integration.md`）にある設定を、そのまま2つのファイルに書く。

| ファイル                  | 中身                                                                        |
| ------------------------- | --------------------------------------------------------------------------- |
| `.vscode/extensions.json` | Vite Plus Extension Pack を、入れるべき拡張機能としてすすめる               |
| `.vscode/settings.json`   | 保存したときに Oxfmt で整形し、手で保存したときは lint の安全な修正もかける |

- 保存したときの整形は TypeScript のほかに、Markdown、JSON、CSS にもかかる
- lint の修正（`source.fixAll.oxc`）は `"explicit"` にしてあるので、手で保存したとき（⌘S）だけかかる。自動保存ではかからない
- 整形（`editor.formatOnSave`）は、一定時間ごとの自動保存（`files.autoSave` が `"afterDelay"`）ではかからない
- Oxfmt は一部だけの整形ができない。そのため、`editor.formatOnSaveMode` を `"file"` にして、保存のたびにファイル全体を整形する

## 8. ほかの作業に渡すこと

CI の設計（#13）

- ルートで `vp check --deny-warnings` を打つ

テスト（#18）

- テストのファイルに、プリセットの設定のほかに足すルールがあるかを決める

DB の設計の実装

- 見本の表を置き換えたら、2章の例外を外す

CLI の実装

- `cli/` は、`vp create vite:library` が作ったひな形に、名前（`enikki-cli`）、`engines`、Node.js 24 の `@types/node` を足しただけにしてある。`bin` の `enikki` は、CLI のコードと一緒に足す
- プリセットは `no-console` を `error` にしている。CLI はターミナルに結果を出すので、`cli/` だけに当てるルールを決める

## 9. まだ確かめていないこと

- VS Code で保存したときに、整形と修正が実際にかかるか。拡張機能を入れた VS Code では試していない
- R2 を読み書きするときに import するモジュールの名前。分かれば、2番のルールに足す
- `.github/ISSUE_TEMPLATE/` を整形して `- [ ] ` の後ろの空白が消えたとき、GitHub で空のチェックボックスとして表示されるか

## 10. 今回はやらないこと

- 2章の「ルールにしないもの」に挙げた依存の向きのルール
- ルールを外すコメントに、ルール名と理由が書いてあるかを確かめるカスタムルール
- `cli/` だけに当てるルール。`cli/` のコードを書き始めてから決める
- 設定の当て方（`overrides` と組み込みのルールのオプション）を確かめる統合テスト。正しいコードを止める誤検知は、`web/src/server/` にコードができれば `vp check` で気づける。違反を通してしまう見逃しは、レビューで見つける
- @cloudflare/oxlint-config が配る AI 向けの skill を、pnpm で許可すること。依存を入れると pnpm が許可を求めるが、許可していない
