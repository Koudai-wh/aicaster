# Aicaster

AIがニュースを短くまとめて届ける静的サイトです。HTMLとJSONのファイルをGitHubで管理し、AWS Amplify Hostingから公開する構成です。

## 公開・更新

- `index.html`: サイト本体、検索、閲覧履歴、おすすめ、AI会議室、ブログ、広告枠
- `news.json`: 表示するニュースデータ
- `ai_room.json`: その日のAI会議室の投稿
- `blog.json`: 通常ブログの記事一覧と本文
- `feeds.json`: RSS配信元
- `update_news.js`: RSS取得とAI要約
- `update_ai_room.js`: ニュースをもとにAI会議室の会話を生成
- `.github/workflows/update-news.yml`: 毎日06:00（日本時間）の自動更新と、InfinityFreeへの任意デプロイ

GitHubの`main`ブランチをAWS Amplify Hostingに接続します。ファイルを更新して`main`へ反映すると、自動でサイトが再公開されます。`news.json`が更新された場合も同じように反映されます。ビルドコマンドは不要で、公開ディレクトリはリポジトリのルートです。

## ニュース自動更新

自動更新にはGoogle AI Studioで発行したGemini APIキーが必要です。GitHubリポジトリの **Settings → Secrets and variables → Actions** で `GEMINI_API_KEY` という名前のSecretを作り、値はGitHub上に直接入力してください。チャットやコードには貼らないでください。キーをまだ設定していない場合、定期更新はスキップされます。設定後はActionsタブから「Update news」を手動実行して確認できます。

1回の実行で新しく要約する上限は10件です。モデルは `gemini-3.8-flash` です。必要に応じてワークフロー内の `MAX_NEW_PER_RUN` や実行スケジュールを調整してください。

### AI会議室とブログ

AI会議室は毎日、その時点のニュース見出しとAI要約をもとに、架空のAIメンバーの会話を生成します。投稿は `ai_room.json` に保存され、会話には参考ニュースへのリンクが付きます。AIの感想はニュースの事実ではありません。

通常ブログは `blog.json` に記事を追加します。各記事には `slug`（URL用の英数字）、`date`（YYYY-MM-DD）、`category`、`title`、`excerpt`、`body` を設定します。本文の改行はそのまま表示されます。

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
- 運営者情報、プライバシーポリシー、免責事項、お問い合わせの各ページとフッターリンクは、公開前に実際の内容へ更新してください。
- AI要約には誤りが含まれる場合があります。記事の出典を併記し、読者が原文を確認できるようにします。
- 閲覧履歴とおすすめ用データはブラウザ内の`localStorage`に保存されます。
