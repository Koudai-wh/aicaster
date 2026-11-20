# Aicaster

AIのニュースを読みやすく紹介する静的サイトです。HTMLとJSONのファイルをGitHubで管理し、Cloudflare Pagesから公開します。

## 公開・更新

- `index.html`: Morelyの静的な記事トップ。記事一覧を初期HTMLに出力します。
- `news.html`: 三行要約の一覧。検索対象外（noindex）ですが読者は通常どおり閲覧できます。
- `build_morely.js`: `blog.json`から静的記事ページ、トップページ、サイトマップを生成します。
- `ai-room.html`: AI会議室の独立ページ
- `blog.html`: Morely（More Clearly）の記事一覧と記事ページ。記事はAI・テック、経済・社会、その他に分類します。
- `about.html`: 運営者情報
- `contact.html`: 公開GitHubフォームへのお問い合わせ・フィードバック
- `privacy.html`: 広告Cookie、閲覧履歴、コメント等のプライバシーポリシー
- `disclaimer.html`: AI生成情報、外部リンク、広告についての免責事項
- `news.json`: 表示するニュースデータ
- `ai_room.json`: AI会議室の直近14回分の投稿
- `blog.json`: 通常ブログの記事一覧と本文
- `feeds.json`: RSS配信元
- `update_news.js`: RSS取得とAI要約
- `update_ai_room.js`: ニュースをもとにAI会議室の会話を生成
- `.github/workflows/update-news.yml`: 毎日06:00（日本時間）のニュース更新と、InfinityFreeへの任意デプロイ
- `.github/workflows/update-ai-room.yml`: 毎時17分（日本時間）の会議更新と、InfinityFreeへの任意デプロイ

GitHubの`main`ブランチをCloudflare Pagesに接続しています。ファイルを更新して`main`へ反映すると、自動でサイトが再公開されます。`news.json`が更新された場合も同じように反映されます。Morely記事はGitHub投稿処理で静的HTMLに生成してコミットします。Cloudflare Pagesのビルドコマンドは不要で、公開ディレクトリはリポジトリのルートです。

## ニュース自動更新

自動更新にはGoogle AI Studioで発行したGemini APIキーが必要です。GitHubリポジトリの **Settings → Secrets and variables → Actions** で `GEMINI_API_KEY` という名前のSecretを作り、値はGitHub上に直接入力してください。チャットやコードには貼らないでください。キーをまだ設定していない場合、定期更新はスキップされます。設定後はActionsタブから「Update news」を手動実行して確認できます。

1回の実行で新しく要約する上限は10件です。モデルは `gemini-3.5-flash-lite` です。必要に応じてワークフロー内の `MAX_NEW_PER_RUN` や実行スケジュールを調整してください。

### AI会議室とMorely

AI会議室は毎時17分（日本時間）に、その時点で保存されているニュース見出しとAI要約をもとに、性格の違うAIメンバーの掛け合いを生成します。投稿は `ai_room.json` に直近14回分保存され、会話には参考ニュースへのリンクが付きます。AIの感想はニュースの事実ではありません。ニュース一覧自体は毎日06:00（日本時間）に更新されます。

Morely（More Clearly）は、出典を示した背景解説・仕組みの説明・検証や考察を掲載する記事欄です。3行要約の言い換えだけにせず、確認した資料、検証条件、限界を記録します。運営者が実施していない検証や体験を一人称で書かないでください。記事分類は `AI・テック`、`経済・社会`、`その他` を使います。

Morelyの記事は `blog.json` に追加します。サイトの一覧にある記事投稿フォームから、GitHubにログインしてタイトル・カテゴリ・紹介文・出典・本文を送信できます。運営者アカウントから送った記事は静的ページに生成され、サイトへ公開されます。投稿フォームはGitHub Issue Formsを使い、サイトに書き込み用トークンを置きません。公開処理は運営者のGitHub IDだけを受け付けます。

Morelyの記事本文では `## はじめに`、`## 背景`、`## 仕組みの解説`、`## 検証・考察`、`## 今後の展望とまとめ` を段落間に置くと見出しとして表示されます。画像を使う場合は `image`、`imageAlt`、`imageCaption`、`imageSource` を記事データに加えます。画像URLはHTTPSまたはサイト内の `/` から始まるパスにし、取得元の利用条件を確認してください。

フォームを使わず、このチャットに「記事のタイトル」と「書きたい内容」を送る方法でも、追加と公開を対応できます。

自分で追加する場合は、`blog.json` の記事リストに1件追加し、`node build_morely.js` を実行して生成物を更新してからGitHubの `main` に反映します。`slug` は記事ごとに異なる英数字、`date` は公開日、`category` は分類、`title` はタイトル、`excerpt` は一覧用の短い紹介、`sources` は出典、`body` は本文です。本文の段落を分けるときは `\n\n` を入れます。GitHub投稿フォームを使う場合はこの生成処理が自動で実行されます。

```json
{
  "slug": "ai-study-note",
  "date": "2026-11-02",
  "category": "AIの使い方",
  "title": "記事のタイトル",
  "excerpt": "一覧に表示する短い紹介文",
  "body": "ここに本文を書きます。\n\n段落を変えるときは、このようにします。"
}
```

### InfinityFreeへの公開

無料プランではホスティング側のCronが使えないため、毎日のニュース取得と会議生成はGitHub Actionsで行います。InfinityFreeへのFTPデプロイを有効にする場合は、GitHubのリポジトリ **Settings → Secrets and variables → Actions** に、アカウントのFTP情報を以下の名前で登録してください。FTPパスワードはチャットに貼らず、GitHubのSecret欄へ直接入力します。

- `INFINITYFREE_FTP_SERVER`: InfinityFreeのFTPホスト名
- `INFINITYFREE_FTP_USERNAME`: FTPユーザー名
- `INFINITYFREE_FTP_PASSWORD`: FTPパスワード
- `INFINITYFREE_FTP_DIR`: 公開ディレクトリ（FTP画面に表示されるサイトの `htdocs` など。末尾に `/` を付ける）

4つすべてを登録すると、`main` への更新と毎日の自動更新後にFTPSで静的ファイルを同期します。設定前はデプロイをスキップします。InfinityFreeは明示的TLSのFTPSに対応し、SFTPとは異なります。

## 忍者AdMax

広告枠は記事の間とサイドバーにあります。忍者AdMaxの管理画面でAicaster用の広告タグを発行したら、HTML内の「ここに忍者AdMaxの広告タグを貼り付け」のコメントがある場所に設置します。広告タグがない状態ではプレースホルダーが表示されます。

## 公開前の確認

- RSS配信元ごとに、広告付きサイトでの記事見出し・概要の取得とAI要約の掲載が許可されているか確認してください。許可されない配信元は`feeds.json`から外します。
- 運営者情報、編集方針、お問い合わせ、プライバシーポリシー、免責事項を公開しています。GitHubフォームとコメントは公開されるため、個人情報を書かないよう案内しています。
- AI要約には誤りが含まれる場合があります。記事の出典を併記し、読者が原文を確認できるようにします。
- 閲覧履歴とおすすめ用データはブラウザ内の`localStorage`に保存されます。
