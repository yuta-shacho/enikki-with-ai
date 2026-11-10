# API の設計

CLI が呼ぶ API と、画面に絵を返すルートの仕様をまとめる。ルールは [ドメイン](domain-model.md)、全体の構成は [システム構成](architecture.md)、表と R2 の絵の名前は [DB の設計](db-design.md) に書いてある。

## 1. 概要

ベース URL は `https://{サイトのドメイン}` にする。ドメインはまだ決めていない。

| メソッド | パス                            | 説明                     | 認証     |
| -------- | ------------------------------- | ------------------------ | -------- |
| `PUT`    | `/api/v1/enikki/today/{aiType}` | 今日の絵日記を提出する   | API キー |
| `PATCH`  | `/api/v1/token-usages`          | 消費トークン量を記録する | API キー |
| `GET`    | `/api/v1/me`                    | API キーの持ち主を返す   | API キー |
| `GET`    | `/images/{date}/{aiType}`       | 絵日記の絵を返す         | Cookie   |

API を呼ぶのは CLI だけにする。画面のデータは、画面と対になる `.server.ts` の loader と action で読み書きするので、API を通らない。絵を返すルートは、画面の `<img>` からブラウザが呼ぶ。

## 2. 認証

### API キー

API は、`Authorization` ヘッダーの API キーで利用者を決める。

```http
Authorization: Bearer <API キー>
```

- API キーは利用者ごとに1つで、利用者が画面で作り、CLI に設定する
- キーは `Authorization` ヘッダーだけで受け付け、クエリパラメーターでは受け付けない
- キーが付いていないときと、キーが見つからないときは `401` を返す（4章）

### Cookie

絵を返すルートは、ログインのセッションの Cookie で利用者を決める。ログインしていなければ `401` を返す。

## 3. リクエストとレスポンスの形

| 項目        | 形                                                                        |
| ----------- | ------------------------------------------------------------------------- |
| 本文        | JSON（`application/json`）。絵日記の提出だけ `multipart/form-data`        |
| JSON のキー | camelCase（`inputTokens`）                                                |
| 日付        | `YYYY-MM-DD`（`2026-11-10`）。日本時間の暦の日付                          |
| AI の種類   | `claude_code`（Claude Code）か `codex`（Codex）。D1 の `ai_type` と同じ値 |
| エラー      | Problem Details（`application/problem+json`）。4章                        |

- CLI は、`User-Agent: enikki-cli/<バージョン>` でバージョンを送る（`enikki-cli/1.2.0`）。古い CLI がどれだけ使われているかを、ログで確かめるために使う
- CLI は、レスポンスの JSON にある知らないキーを無視する（6章）

## 4. エラー

成功したときは `2xx` を返す。リクエストが原因で断るときは `4xx`、サーバーの中で失敗したときは `5xx` を返す。

### ステータスコード

| ステータス                  | 返すとき                                                                        |
| --------------------------- | ------------------------------------------------------------------------------- |
| `400 Bad Request`           | 本文の形が読めない（JSON として読めない、`usages` がないなど）                  |
| `401 Unauthorized`          | API キーが付いていないか、見つからない。ログインせずに絵を開いた                |
| `404 Not Found`             | パスが指すものがない（知らない AI の種類、R2 にない絵、どのルートにも合わない） |
| `409 Conflict`              | ハンコを押した日の絵日記に提出した                                              |
| `413 Content Too Large`     | 絵が 5 MB を超える                                                              |
| `422 Unprocessable Content` | 本文の形は読めたが、値がおかしい                                                |
| `500 Internal Server Error` | 想定していなかった失敗                                                          |

### エラーの本文

エラーの本文は Problem Details（RFC 9457）にする。

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://{サイトのドメイン}/problems/enikki-stamped",
  "title": "ハンコが押された絵日記です",
  "status": 409,
  "detail": "2026-11-10 の claude_code の絵日記には、ハンコが押されています"
}
```

| キー     | 型      | 説明                                                                                                                                 |
| -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `type`   | string  | エラーの種類を表す URI。`https://{サイトのドメイン}/problems/{名前}`。CLI が見分けなくてよいエラーでは省き、`about:blank` として扱う |
| `title`  | string  | 種類ごとに決まった、日本語の短い文                                                                                                   |
| `status` | integer | HTTP のステータスと同じ値                                                                                                            |
| `detail` | string  | このリクエストで何がおかしいかを書いた日本語の文。`500` では省く                                                                     |

- CLI は `type` でエラーを見分け、AI に見せる文を作る。`title` と `detail` は、人がログで読むための文にする
- `type` の URL には、その種類を説明するページを置く
- API の `401` には `WWW-Authenticate` を付ける。キーが付いていないときは `Bearer`、キーが見つからないときは `Bearer error="invalid_token"` にする（RFC 6750）

### `type` の一覧

| 名前                   | ステータス | 起きるとき                                                         |
| ---------------------- | ---------- | ------------------------------------------------------------------ |
| `missing-api-key`      | `401`      | API キーが付いていない                                             |
| `invalid-api-key`      | `401`      | API キーが見つからない（打ち間違えたキーや、作り直す前の古いキー） |
| `unknown-ai-type`      | `404`      | パスの `aiType` が `claude_code` でも `codex` でもない             |
| `invalid-image`        | `422`      | `image` がない、WebP でない、長い辺が 2,048 px を超える            |
| `image-too-large`      | `413`      | `image` が 5 MB を超える                                           |
| `invalid-text`         | `422`      | `text` がない、前後の空白を除くと空、長さの上限を超える            |
| `enikki-stamped`       | `409`      | ハンコを押した日の絵日記に提出した                                 |
| `invalid-token-usages` | `422`      | 消費トークン量の値がおかしい（5章）                                |

`400`、`500`、どのルートにも合わないときの `404`、絵を返すルートのエラーには `type` を付けない。

## 5. エンドポイント

### 絵日記を提出する

```http
PUT /api/v1/enikki/today/{aiType}
```

今日の絵日記を作る。同じ AI の種類の今日の絵日記がすでにあり、ハンコを押す前なら、絵と文章を置きかえる。日付はサーバーが日本時間で決める。

**認証**: API キー

#### リクエスト

##### パスパラメーター

| 名前     | 型     | 必須 | 説明                                |
| -------- | ------ | ---- | ----------------------------------- |
| `aiType` | string | 必須 | AI の種類。`claude_code` か `codex` |

##### 本文（`multipart/form-data`）

| 名前    | 型     | 必須 | 説明                                                                                             |
| ------- | ------ | ---- | ------------------------------------------------------------------------------------------------ |
| `image` | file   | 必須 | 絵。WebP で、5 MB まで、長い辺は 2,048 px まで。サーバーは先頭のバイトで形式を確かめ、変換しない |
| `text`  | string | 必須 | 文章。前後の空白を除いて空でないこと。長さの上限は使いながら決める                               |

##### 例

```http
PUT /api/v1/enikki/today/claude_code HTTP/1.1
Authorization: Bearer <API キー>
User-Agent: enikki-cli/1.2.0
Content-Type: multipart/form-data; boundary=enikki

--enikki
Content-Disposition: form-data; name="image"; filename="enikki.webp"
Content-Type: image/webp

（WebP のバイト列）
--enikki
Content-Disposition: form-data; name="text"

今日は、ログインの画面を一緒に作った。
--enikki--
```

#### レスポンス

| ステータス                  | 説明                                        |
| --------------------------- | ------------------------------------------- |
| `201 Created`               | 今日の絵日記を初めて作った                  |
| `200 OK`                    | ハンコを押す前の絵日記を置きかえた          |
| `400 Bad Request`           | 本文が `multipart/form-data` として読めない |
| `401 Unauthorized`          | `missing-api-key`、`invalid-api-key`        |
| `404 Not Found`             | `unknown-ai-type`                           |
| `409 Conflict`              | `enikki-stamped`                            |
| `413 Content Too Large`     | `image-too-large`                           |
| `422 Unprocessable Content` | `invalid-image`、`invalid-text`             |

##### 201 Created、200 OK

| 名前   | 型     | 説明         |
| ------ | ------ | ------------ |
| `date` | string | 絵日記の日付 |

```http
HTTP/1.1 201 Created
Content-Type: application/json

{ "date": "2026-11-10" }
```

##### 409 Conflict

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://{サイトのドメイン}/problems/enikki-stamped",
  "title": "ハンコが押された絵日記です",
  "status": 409,
  "detail": "2026-11-10 の claude_code の絵日記には、ハンコが押されています"
}
```

#### 備考

- 絵は新しい名前で R2 に置き、D1 に書けたら前の絵を消す（[システム構成](architecture.md) の5章）
- 前の絵を消せなかったときも、`201` か `200` を返す。どの絵日記からも指されない絵が R2 に残るが、消さない
- D1 に書けなかったときと、ハンコを押した日なので書かなかったときは、置いた絵を消して、それぞれ `500` と `409` を返す。置いた絵を消せなかったときも、残った絵は消さない
- 0時をまたいで送り直すと、2つの日に1件ずつ絵日記ができる

### 消費トークン量を記録する

```http
PATCH /api/v1/token-usages
```

利用者、AI の種類、日付ごとの消費トークン量を、送った値で置きかえる。まだ記録のない日は作る。ハンコを押した日の分も置きかえる。

**認証**: API キー

#### リクエスト

##### 本文（`application/json`）

| 名前                        | 型       | 必須 | 説明                                                      |
| --------------------------- | -------- | ---- | --------------------------------------------------------- |
| `usages`                    | object[] | 必須 | 1日分の記録の配列。1件以上で、「7 × AI の種類の数」件まで |
| `usages[].date`             | string   | 必須 | 日付                                                      |
| `usages[].aiType`           | string   | 必須 | AI の種類                                                 |
| `usages[].inputTokens`      | integer  | 必須 | 入力。0以上                                               |
| `usages[].cacheWriteTokens` | integer  | 必須 | キャッシュ書き込み。0以上                                 |
| `usages[].cacheReadTokens`  | integer  | 必須 | キャッシュ読み込み。0以上                                 |
| `usages[].outputTokens`     | integer  | 必須 | 出力。0以上                                               |

- 同じ `date` と `aiType` の組は、1回だけ入れられる
- 記録できるのは、今日を含む直近7日分にする。範囲の外の日（未来の日と、直近7日より前の日）は除き、残りを書く

##### 例

```http
PATCH /api/v1/token-usages HTTP/1.1
Authorization: Bearer <API キー>
User-Agent: enikki-cli/1.2.0
Content-Type: application/json

{
  "usages": [
    {
      "date": "2026-11-09",
      "aiType": "claude_code",
      "inputTokens": 12000,
      "cacheWriteTokens": 3400,
      "cacheReadTokens": 560000,
      "outputTokens": 8900
    },
    {
      "date": "2026-11-10",
      "aiType": "claude_code",
      "inputTokens": 3000,
      "cacheWriteTokens": 800,
      "cacheReadTokens": 120000,
      "outputTokens": 2100
    }
  ]
}
```

#### レスポンス

| ステータス                  | 説明                                                                  |
| --------------------------- | --------------------------------------------------------------------- |
| `204 No Content`            | 記録した。範囲の外の日を除いたときも同じ                              |
| `400 Bad Request`           | 本文が JSON として読めない、`usages` がない                           |
| `401 Unauthorized`          | `missing-api-key`、`invalid-api-key`                                  |
| `422 Unprocessable Content` | `invalid-token-usages`。範囲の外の日のほかに、1件でもおかしな値がある |

##### 422 Unprocessable Content

```http
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "https://{サイトのドメイン}/problems/invalid-token-usages",
  "title": "消費トークン量の値が正しくありません",
  "status": 422,
  "detail": "usages[0].inputTokens が0以上の整数ではありません"
}
```

#### 備考

- 1件ずつの書き込みを `db.batch()` でまとめる。`db.batch()` は全部を書くか全部を取り消すので、範囲の外の日は書く前に除く
- 本文は、JSON Patch のような決まった形式ではなく、この API で決めた形にする

### API キーの持ち主を返す

```http
GET /api/v1/me
```

API キーの持ち主の利用者を返す。CLI は、利用者が API キーを設定したときに呼び、キーが使えるかを確かめる。

**認証**: API キー

#### リクエスト

```http
GET /api/v1/me HTTP/1.1
Authorization: Bearer <API キー>
User-Agent: enikki-cli/1.2.0
```

#### レスポンス

| ステータス         | 説明                                 |
| ------------------ | ------------------------------------ |
| `200 OK`           | キーが使える                         |
| `401 Unauthorized` | `missing-api-key`、`invalid-api-key` |

##### 200 OK

| 名前   | 型     | 説明                                                                                                |
| ------ | ------ | --------------------------------------------------------------------------------------------------- |
| `name` | string | 利用者の名前。Better Auth の `user.name` で、ログインに使った GitHub か Google のアカウントから入る |

```http
HTTP/1.1 200 OK
Content-Type: application/json

{ "name": "Taro" }
```

##### 401 Unauthorized

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer error="invalid_token"
Content-Type: application/problem+json

{
  "type": "https://{サイトのドメイン}/problems/invalid-api-key",
  "title": "API キーが見つかりません",
  "status": 401,
  "detail": "API キーを作り直した場合は、新しいキーを設定してください"
}
```

### 絵を返す

```http
GET /images/{date}/{aiType}?v={uuid}
```

ログインしている利用者の絵日記の絵を返す。画面の loader が、D1 の `image_key` の uuid を入れた URL を返し、画面はその URL を `<img src>` に入れる。

**認証**: Cookie

#### リクエスト

##### パスパラメーター

| 名前     | 型     | 必須 | 説明                                |
| -------- | ------ | ---- | ----------------------------------- |
| `date`   | string | 必須 | 絵日記の日付                        |
| `aiType` | string | 必須 | AI の種類。`claude_code` か `codex` |

##### クエリパラメーター

| 名前 | 型     | 必須 | 説明                     |
| ---- | ------ | ---- | ------------------------ |
| `v`  | string | 必須 | R2 の絵の名前にある uuid |

##### 例

```http
GET /images/2026-11-10/claude_code?v=0b7e7c5e-3f0a-4c49-9a57-2f1d8f6a3c21 HTTP/1.1
Cookie: （ログインのセッション）
```

#### レスポンス

| ステータス         | 説明                                     |
| ------------------ | ---------------------------------------- |
| `200 OK`           | 絵を返した                               |
| `401 Unauthorized` | ログインしていない                       |
| `404 Not Found`    | R2 に絵がない。パスか `v` の形が合わない |

##### 200 OK

```http
HTTP/1.1 200 OK
Content-Type: image/webp
Cache-Control: private, max-age=31536000, immutable

（WebP のバイト列）
```

#### 備考

- Cookie の利用者、パスの日付と AI の種類、`v` から、R2 の名前 `{user_id}/{ai_type}/{enikki_date}/{v}.webp` を作り、その絵を返す。D1 は読まない
- 名前は Cookie の利用者 ID から始まるので、ほかの利用者の絵を指す URL はない
- `date`、`aiType`、`v` の形を確かめてから、R2 の名前に入れる
- 古い uuid の URL が届いたときは、前の絵が R2 に残っていればその絵を返し、消えていれば `404` を返す

## 6. バージョンと互換性

API のパスには、`/api/v1/` のようにバージョンを入れる。利用者のマシンには古い CLI が残るので、API を変えたあとも、古い CLI からの提出を受け付ける（[システム構成](architecture.md) の2章）。古い CLI を壊す変更が要るときは、`/api/v2/…` を新しく作り、`/api/v1/…` も残す。

| 変更                                 | 古い CLI | 理由                                                          |
| ------------------------------------ | -------- | ------------------------------------------------------------- |
| レスポンスの JSON にキーを足す       | 壊さない | CLI は知らないキーを無視する                                  |
| 必ず送っていた値を、省けるようにする | 壊さない | 古い CLI は今までどおりに送り、サーバーはそれを受け付ける     |
| リクエストに、必ず送る値を足す       | 壊す     | 古い CLI はその値を送らないので、サーバーが `422` で断る      |
| `type` の名前を変える                | 壊す     | 古い CLI は知らない `type` として読み、エラーを見分けられない |
| 受け付けたときのステータスを変える   | 壊す     | CLI はステータスで、初めて出したか出し直したかを見分ける      |

CLI は、レスポンスの JSON を Zod の `z.object` のように、知らないキーを除いて読む。`z.strictObject` のように、知らないキーがあると失敗する読み方はしない。

## 7. 型の共有

- CLI は、まず void の typed fetch client（`void/client`）で API を呼べるかを試す
- 使えなければ、スキーマを置くパッケージを workspace に作り、web と cli の両方が import する。そのときは、[システム構成](architecture.md) の配置の図にパッケージを足す。CLI は npm で配るので、スキーマはビルドのときに CLI に入れる
- web の `routes/api/` では、届いた値を確かめる処理を自分で書く。void の `withValidator` は、確かめに失敗すると独自の形の本文で `400` を返し、4章の返し方に合わないためだ
