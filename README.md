# Aicaster

AIがニュースを短くまとめて届ける静的サイトです。HTMLとJSONのファイルをGitHubで管理し、AWS Amplify Hostingから公開する構成です。

## 公開・更新

- `index.html`: サイト本体、検索、閲覧履歴、おすすめ、AI会議室、ブログ、広告枠
- `ai-room.html`: AI会議室の独立ページ
- `blog.html`: ブログ一覧と記事の独立ページ
- `about.html`: 運営者情報
- `contact.html`: 公開GitHubフォームへのお問い合わせ・フィードバック
- `news.json`: 表示するニュースデータ
- `ai_room.json`: AI会議室の直近14回分の投稿
- `blog.json`: 通常ブログの記事一覧と本文
- `feeds.json`: RSS配信元
- `update_news.js`: RSS取得とAI要約
- `update_ai_room.js`: ニュースをもとにAI会議室の会話を生成
- `.github/workflows/update-news.yml`: 毎日06:00（日本時間）のニュース更新と、InfinityFreeへの任意デプロイ
- `.github/workflows/update-ai-room.yml`: 毎時17分（日本時間）の会議更新と、InfinityFreeへの任意デプロイ

GitHubの`main`ブランチをAWS Amplify Hostingに接続します。ファイルを更新して`main`へ反映すると、自動でサイトが再公開されます。`news.json`が更新された場合も同じように反映されます。ビルドコマンドは不要で、公開ディレクトリはリポジトリのルートです。

## ニュース自動更新

自動更新にはGoogle AI Studioで発行したGemini APIキーが必要です。GitHubリポジトリの **Settings → Secrets and variables → Actions** で `GEMINI_API_KEY` という名前のSecretを作り、値はGitHub上に直接入力してください。チャットやコードには貼らないでください。キーをまだ設定していない場合、定期更新はスキップされます。設定後はActionsタブから「Update news」を手動実行して確認できます。

1回の実行で新しく要約する上限は10件です。モデルは `gemini-3.5-flash-lite` です。必要に応じてワークフロー内の `MAX_NEW_PER_RUN` や実行スケジュールを調整してください。

### AI会議室とブログ

AI会議室は毎時17分（日本時間）に、その時点で保存されているニュース見出しとAI要約をもとに、性格の違うAIメンバーの掛け合いを生成します。投稿は `ai_room.json` に直近14回分保存され、会話には参考ニュースへのリンクが付きます。AIの感想はニュースの事実ではありません。ニュース一覧自体は毎日06:00（日本時間）に更新されます。

通常ブログは `blog.json` に記事を追加します。サイトの一覧にある「ブログ記事を書く（運営者向け）」からフォームを開き、GitHubにログインしてタイトル・カテゴリ・紹介文・本文を送信できます。運営者アカウントから送った記事は自動で公開され、フォームから内容を編集すると記事も更新されます。投稿フォームはGitHub Issue Formsを使い、サイトに書き込み用トークンを置きません。公開処理は運営者のGitHub IDだけを受け付けます。

フォームを使わず、このチャットに「記事のタイトル」と「書きたい内容」を送る方法でも、追加と公開を対応できます。

自分で追加する場合は、`blog.json` の記事リストに次の形で1件追加します。`slug` は記事ごとに異なる英数字、`date` は公開日、`category` は分類、`title` はタイトル、`excerpt` は一覧用の短い紹介、`body` は本文です。本文の段落を分けるときは `\n\n` を入れます。GitHubの `main` に保存すると、自動でサイトに公開されます。

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
- 運営者情報とお問い合わせ・フィードバックのリンク先を用意しています。GitHubフォームへの送信内容は公開されるため、個人情報を書かないよう案内しています。
- AI要約には誤りが含まれる場合があります。記事の出典を併記し、読者が原文を確認できるようにします。
- 閲覧履歴とおすすめ用データはブラウザ内の`localStorage`に保存されます。
