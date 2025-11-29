# KouTechHP プロジェクトドキュメント

## プロジェクト概要

**KouTechHP** - 授業ログ用のWebサイト

### 目的
- 授業の内容を整理し、GitHub Pages上で生徒が閲覧できる授業ページを自動生成する
- 音声テキスト、板書画像、プリントPDFから、HTML、TeX、PDFを自動生成する
- 復習問題を含む授業ログを提供し、生徒の学習を支援する

### ホスティング
- **GitHub Pages**を使用
- リポジトリ容量制限: 推奨1GB未満、単一ファイル100MB制限

### 対象ユーザー
- **主要ユーザー**: 高校生（数学授業の受講者）
- **管理者**: 授業担当者（KouTech）

---

## 機能

- Google Drive側の`raw materials`フォルダから音声テキスト、画像、PDFを読み込み
- 授業内容のポイントを自動抽出（キーワードベース）
- HTMLページを生成（授業内容のポイント＋復習問題）
  - MathJaxによる数式レンダリング対応
  - 統一ヘッダー・フッター
  - 1〜40の授業へのナビゲーションボタン
  - Google Fonts（Montserrat、Noto Sans JP）
- TeXファイルを生成（B5判、二段組）
- PDFを自動コンパイル（latexmk使用）
- **PDF最適化機能**（Ghostscript使用）
  - 自動的にPDFファイルサイズを削減（通常30-50%削減）
  - GitHubリポジトリの容量制限対策
  - 最適化に失敗した場合は元のPDFを使用（フォールバック機能）

---

## クイックスタート

### セットアップ

#### 1. 環境変数の設定

スクリプトを実行する前に、以下の環境変数を設定してください：

##### 環境変数の目的

環境変数は、スクリプトが**データの読み込み元**と**ファイルの出力先**を正しく認識するために必要です。

- **入力データの場所**: Google Drive側の`raw materials`フォルダから音声テキスト、画像、PDFを読み込む
- **出力ファイルの場所**: KouTechHPリポジトリに生成されたHTML、TeX、PDFを保存する

##### 必須
- **`KOUTECH_HP_BASE`**: KouTechHPリポジトリのパス（**出力先**）
  - 生成されたHTML、TeX、PDFファイルを保存する場所
  - 例: `'/Users/kou/Documents/GitHub/KouTechHP'`
  - この環境変数が設定されていないと、スクリプトはエラーで停止します

##### オプション
- **`KOUTECH_DRIVE_BASE`**: Google Drive側のベースパス（**入力元**）
  - 音声テキスト、画像、PDFが保存されている`raw materials`フォルダの親ディレクトリ
  - デフォルト: `'/Users/kou/Library/CloudStorage/GoogleDrive-koutech1216@gmail.com/マイドライブ/Tex'`
  - 設定しない場合はデフォルトパスを使用
  - デフォルトパスが存在しない場合、この環境変数の設定が必要です

```bash
export KOUTECH_HP_BASE='/path/to/KouTechHP'
export KOUTECH_DRIVE_BASE='/path/to/Drive/Tex'  # オプション
```

#### 2. スクリプトの配置

`generate_lesson.py`は外部（Google Drive側など）に配置することを推奨します。
リポジトリには含まれていません（個人情報を含む可能性があるため）。

#### 3. 必要なソフトウェア

##### 必須
- **Python**: 3.6以上
- **LaTeX環境**: 
  - uplatex
  - latexmk
  - 必要なパッケージ: jsarticlek、emath、tcolorbox、amsmath、multicolなど

##### オプション
- **Ghostscript**: PDF最適化用
  - インストールされていない場合、最適化はスキップされ、元のPDFが使用されます
  - macOS: `brew install ghostscript`
  - Linux: `sudo apt-get install ghostscript` または `sudo yum install ghostscript`

### 使用方法

#### コマンドライン引数

```bash
python generate_lesson.py <class> <term> <lesson_num> [audio_filename]
```

##### 引数
- **`class`**: クラス名（例: `H1P3_math_P`, `H1P3_math_Q`）
- **`term`**: 学期（例: `t1`, `t2`, `t3`）
- **`lesson_num`**: 授業番号（例: `1`, `2`, `3...`）
- **`audio_filename`**: 音声テキストファイル名（オプション）
  - 指定しない場合は、`raw materials`フォルダ内の`.txt`ファイル一覧を表示

##### 固定値
- **年度**: `2026`（固定）

#### 使用例

```bash
# 環境変数を設定
export KOUTECH_HP_BASE='/Users/kou/Documents/GitHub/KouTechHP'

# スクリプトを実行（ファイル名指定あり）
python generate_lesson.py H1P3_math_P t1 1 '05-29 講義: 因数分解.txt'

# スクリプトを実行（ファイル名指定なし → 一覧表示）
python generate_lesson.py H1P3_math_P t1 1
```

---

## 詳細仕様

### システム構成

#### ディレクトリ構造（固定）

```
/KouTechHP
  /assets
    /css
      style.css
    /img
    /js
      tabs.js
  /2026/
    /<Class>/
      /<Term>/
        /lessons/
          lesson_XX.html
        /pdf/
          lesson_XX.pdf
        /tex/
          lesson_XX.tex
      index.html
    index.html
  index.html
```

#### 階層構造
- **年度** → **クラス** → **学期** → **授業**
- 例: `/2026/H1P3_math_P/t1/lessons/lesson_01.html`

#### クラス名（2026年度）
- `H1P3_math_P` (共学高1P3_数学P)
- `H1P3_math_Q` (共学高1P3_数学Q)

#### 学期
- `t1` (第1学期)
- `t2` (第2学期)
- `t3` (第3学期)

### 入力データ

#### データソース
**Google Drive側の`raw materials`フォルダ**

#### 入力ファイル形式

##### 音声テキスト
- **形式**: `.txt`ファイル
- **生成元**: PLAUD NotePin（音声録音→テキスト化）
- **形式**: Speaker形式（`Speaker 1 00:00:31`など）
- **自動化**: Zapierを使用してPLAUD NotePinからGoogle Driveへ自動保存

##### 板書画像（オプション）
- **形式**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`
- **内容**: 授業中の板書を撮影した画像
- **備考**: オプション（掲載するかどうかは予備的）

##### プリントPDF（オプション）
- **形式**: `.pdf`
- **内容**: 授業で使用したプリント
- **備考**: オプション（掲載するかどうかは予備的）

#### データの取り扱い
- **rawデータは公開しない**: 音声テキスト全文、画像、PDFの生データは公開されない
- **要約のみ公開**: 授業のポイントを抽出し、読みやすく整理した内容のみ公開

### 出力データ

#### 出力場所

生成されたファイルは以下の場所に保存されます：

```
/<year>/<Class>/<Term>/
  /lessons/
    lesson_XX.html
  /pdf/
    lesson_XX.pdf
  /tex/
    lesson_XX.tex
```

例: `/2026/H1P3_math_P/t1/lessons/lesson_01.html`

#### HTMLページ

##### 構造
1. **ページタイトル**（h1）
   - タイトル横に1〜40の授業へのナビゲーションボタンを配置
   - 現在の授業はアクティブ状態でハイライト表示
   - 各ボタンは対応する授業ページ（`lesson_XX.html`）へのリンク

2. **授業の概要**（要約）
   - セクションクラス: `summary`

3. **本時のポイント**（箇条書き）
   - セクションクラス: `key-points`
   - 板書・プリントの要点も本時のポイントに含める
   - 重要な公式、定理、例題、解説などを箇条書きで整理

4. **復習問題**（4種類）
   - セクションクラス: `review-questions`

##### 復習問題の種類
1. **用語の確認**
   - 穴埋め / 選択式
2. **公式の確認**
   - 穴埋め形式
3. **基本計算問題**
   - 数問、計算過程は不要
4. **共通テスト形式**
   - 選択式 or 穴埋め

##### 解答の表示
- 全ての問題の「解答」を`<details><summary>解答を見る</summary>...</details>`で折りたたむ

##### ナビゲーション機能
- **授業間ナビゲーション**: ページタイトル横に1〜40の授業へのリンクボタンを配置
  - ボタンスタイル: 小さな角丸ボタン（32px × 32px、モバイルは28px × 28px）
  - アクティブ状態: 現在の授業はシアン背景でハイライト
  - ホバー効果: アクセントカラーに変化、軽い浮き上がり効果
  - CSSクラス: `.lesson-nav`（コンテナ）、`.lesson-nav-btn`（ボタン）、`.active`（アクティブ状態）

##### セクションスタイル
各セクション（`.summary`, `.key-points`, `.review-questions`）に統一されたスタイルを適用：
- **背景**: 半透明の暗い背景（`rgba(255, 255, 255, 0.02)`）
- **ボーダー**: ガラスモーフィズム風のボーダー
- **パディング**: 2rem（モバイルは1.5rem）
- **余白**: セクション間は3rem（モバイルは2rem）
- **復習問題の見出し**: アクセントカラーの左ボーダーで強調
- **本時のポイント**: 箇条書きで表示、板書・プリントの内容も含む

##### HTML生成機能の詳細
- **MathJax**: LaTeX形式の数式レンダリング対応（`$...$` インライン、`$$...$$` ディスプレイ）
- **統一ヘッダー・フッター**: 全ページで統一されたデザイン
- **Google Fonts**: Montserrat（英語）、Noto Sans JP（日本語）
- **レスポンシブデザイン**: モバイル対応

#### TeXファイル

##### レイアウト仕様
- **用紙サイズ**: B5
- **レイアウト**: 二段組（multicol使用）
- **フォント**: 日本語対応（jsarticlek、uplatex使用）

##### セクション構造
1. **表題**（授業名、日付、クラス名）
2. **本時のポイント**（重要事項の要約）
3. **板書内容**（可能な場合は図・式を再現）
4. **例題・解説**（必要に応じて整形）
5. **まとめ**（生徒へのメッセージ・学習ポイント）
6. **復習問題**（HTMLと同じ4種類）

#### PDFファイル

##### 生成方法
- **コンパイラ**: `latexmk`（`-pdfdvi`オプション）
- **最適化**: Ghostscript（`gs`）を使用
  - 設定: `-dPDFSETTINGS=/ebook`（電子書籍用品質、約150dpi）
  - 互換性: PDF 1.4形式
  - 削減率: 通常30-50%のサイズ削減

##### 最適化のフォールバック
- Ghostscriptが利用できない場合、元のPDFを使用
- エラー時も処理を継続（警告のみ表示）

### 機能要件

#### データ読み込み機能
- Google Drive側の`raw materials`フォルダからデータを読み込む
- 音声テキストファイルの指定方法:
  - コマンドライン引数でファイル名を指定可能
  - 指定しない場合は、フォルダ内の`.txt`ファイル一覧を表示

#### ポイント抽出機能
- 音声テキストから重要なポイントを自動抽出
- キーワードベースの抽出（「定理」「定義」「公式」「問題」「解」「例」など）
- Speaker 1（講師）の発言を優先的に抽出

#### 要約生成機能
- 音声テキストから授業の概要を生成
- キーワードベースの要約（「今日」「本日」「授業」「学習」「目標」「目的」など）

#### HTML生成機能
- `hp-html-rules.mdc`に準拠したHTMLを生成
- 共通CSS（`../../../../assets/css/style.css`）を読み込む
- HTML5準拠
- MathJaxによる数式レンダリング対応

#### TeX生成機能
- `hp-tex-rules.mdc`に準拠したTeXを生成
- LaTeX特殊文字の自動エスケープ（`_`, `$`, `&`, `%`, `#`, `^`, `{`, `}`, `\`, `~`）
- 空の`description`環境のエラー回避

#### PDFコンパイル機能
- `latexmk`を使用してTeXをPDFにコンパイル
- タイムアウト設定: 60秒
- エラー時もHTMLとTeXは保存される（警告のみ表示）

#### PDF最適化機能
- Ghostscriptを使用してPDFを最適化
- ファイルサイズの削減（30-50%）
- タイムアウト設定: 120秒
- 最適化失敗時は元のPDFを使用

#### ファイル保存機能
- 必要なディレクトリを自動作成（`mkdir(parents=True, exist_ok=True)`）
- HTML、TeX、PDFを指定された場所に保存

### 非機能要件

#### パフォーマンス
- PDFコンパイル: 60秒以内
- PDF最適化: 120秒以内
- ファイル生成: 数秒以内

#### 容量制限
- **GitHubリポジトリ**: 推奨1GB未満
- **単一ファイル**: 100MB制限
- **対策**: PDF最適化機能で容量削減

#### 互換性
- **Python**: 3.6以上
- **LaTeX**: uplatex、latexmk
- **PDF**: PDF 1.4形式（互換性重視）

#### エラーハンドリング
- 環境変数未設定時はエラーメッセージを表示
- ファイルが見つからない場合はエラーメッセージを表示
- PDFコンパイル失敗時もHTMLとTeXは保存
- PDF最適化失敗時は元のPDFを使用

#### セキュリティ
- 個人情報を含むスクリプト（`generate_lesson.py`）は外部（Google Drive）に配置
- rawデータは公開しない（要約のみ公開）

### UI/UX要件

#### デザインテーマ
- **テーマ**: 「Math & Cyber」
- **色調**: 深い青（`#0f172a`）を基調とした落ち着いた配色
- **アクセント**: ネオンシアン（`#38bdf8`）、ゴールド
- **背景**: グラデーション（深いネイビー→ダークスレート）

#### UI要素
- **ガラスモーフィズム**: カード背景に半透明＋ぼかし効果
- **ダークモード**: 暗い背景で目に優しい
- **ネオングロー**: ホバー時にネオン効果
- **タブUI**: 学期選択などでタブナビゲーションを使用
- **授業ページセクション**: 各セクション（概要、ポイント、板書、復習問題）に統一されたガラスモーフィズムスタイルを適用
- **ナビゲーションボタン**: 授業間を移動するための小さなボタンUI

#### タイポグラフィ
- **フォント**: Google Fonts
  - 英語: Montserrat
  - 日本語: Noto Sans JP
  - **実装**: `body`要素の`font-family`に`"Montserrat", "Noto Sans JP"`を優先的に指定
  - フォールバック: `"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN"`など
- **読みやすさ**: 適切な行間、コントラスト

#### レスポンシブデザイン
- モバイル対応
- カードベースのレイアウト
- グリッドレイアウトでクラス・学期を表示

#### 統一ヘッダー・フッター仕様

##### ヘッダー仕様
全てのページに統一されたヘッダーを実装する。

**構造**:
```html
<header>
  <div class="header-inner">
    <div class="logo">KouTech</div>
    <a href="[相対パス]/index.html" class="btn-outline" style="padding:0.5rem 1rem; font-size:0.8rem;">Topへ戻る</a>
  </div>
</header>
```

**要件**:
- **左上**: 「KouTech」というタイトルを表示
- **右上**: 「Topへ戻る」ボタンを表示
  - ルートページ（`index.html`）では表示しない（ルートページ自体がTopのため）
  - その他の全ページで表示
  - 相対パスでルートの`index.html`にリンク
  - スタイル: `btn-outline`クラス、パディング`0.5rem 1rem`、フォントサイズ`0.8rem`

**適用ページ**:
- ルートページ（`index.html`）: ヘッダーに「KouTech」のみ（「Topへ戻る」なし）
- 年度ページ（`2026/index.html`）: 「KouTech」+ 「Topへ戻る」
- クラスページ（`2026/<Class>/index.html`）: 「KouTech」+ 「Topへ戻る」
- 授業ページ（`2026/<Class>/<Term>/lessons/lesson_XX.html`）: 「KouTech」+ 「Topへ戻る」

##### フッター仕様
全てのページに統一されたフッターを実装する。

**構造**:
```html
<footer>
  <p>&copy; 2026 KouTech</p>
</footer>
```

**要件**:
- **中央揃え**: フッターのテキストは中央に配置
- **内容**: 「© 2026 KouTech」と表示
- **スタイル**: 共通CSS（`assets/css/style.css`）のフッタースタイルを使用

**適用ページ**:
- 全ページに適用（ルートページ、年度ページ、クラスページ、授業ページ）

##### 実装上の注意事項
- ヘッダーとフッターは全てのページで統一された構造・スタイルを使用
- 相対パスは各ページの階層に応じて適切に設定
- Google Fonts（Montserrat、Noto Sans JP）を読み込む
- 共通CSS（`assets/css/style.css`）を必ず読み込む

#### クラスページから授業ページへのリンク

##### 授業カードのリンク仕様
クラスページ（`/<year>/<Class>/index.html`）の学期タブ内の授業カードに、授業ページへのリンクを設定する。

**要件**:
- **カードタイトル**: 「授業 X」形式で表示
- **リンクボタン**: 「授業ログを見る」ボタンをカード内に配置
- **リンク先**: `t<term>/lessons/lesson_XX.html`
- **スタイル**: `btn`クラス、幅100%、上マージン1rem

**実装例**:
```html
<div class="card">
  <span class="card-tag">第1回</span>
  <div class="card-title">授業 1</div>
  <p class="card-desc">2026/XX/XX 実施</p>
  <a href="t1/lessons/lesson_01.html" class="btn" style="width:100%; margin-top:1rem;">授業ログを見る</a>
</div>
```

**適用範囲**:
- 各学期タブ（1学期、2学期、3学期）内の授業カード
- 授業が準備完了している場合のみリンクを表示
- 準備中の授業は「準備中...」テキストを表示

### 制約事項

#### ディレクトリ構造
- フォルダ構造は変更しない
- 出力先は固定（`/<year>/<Class>/<Term>/`）

#### データ公開
- rawデータ（音声テキスト全文、画像、PDF）は公開しない
- 要約・整理した内容のみ公開

#### スクリプトの配置
- `generate_lesson.py`は個人情報を含む可能性があるため、外部（Google Drive）に配置
- リポジトリには含めない

#### 年度固定
- 現在は2026年度に固定
- 将来的には年度を引数で指定可能にする予定

---

## ワークフロー

### 授業ログ生成フロー

```
1. 授業実施
   ↓
2. PLAUD NotePinで音声録音・テキスト化
   ↓
3. ZapierでGoogle Driveのraw materialsフォルダに自動保存
   ↓
4. （オプション）板書画像・プリントPDFを手動でraw materialsフォルダに保存
   ↓
5. generate_lesson.pyを実行
   ↓
6. HTML、TeX、PDFを自動生成
   ↓
7. GitHubリポジトリにコミット・プッシュ
   ↓
8. GitHub Pagesで自動公開
```

### スクリプト実行フロー

```
1. 環境変数の確認
   ↓
2. データ読み込み（音声テキスト、画像、PDF）
   ↓
3. ポイント抽出・要約生成
   ↓
4. HTML生成
   ↓
5. TeX生成
   ↓
6. ファイル保存（HTML、TeX）
   ↓
7. PDFコンパイル
   ↓
8. PDF最適化（オプション）
   ↓
9. PDF保存
```

---

## トラブルシューティング

### 環境変数が設定されていない

```
エラー: 環境変数 KOUTECH_HP_BASE が設定されていません
```

**解決方法**: 環境変数を設定
```bash
export KOUTECH_HP_BASE='/path/to/KouTechHP'
```

### latexmkが見つからない

```
エラー: latexmkが見つかりません。インストールしてください。
```

**解決方法**: LaTeX環境をインストール（MacTeX、TeX Liveなど）

### Ghostscriptが見つからない（PDF最適化がスキップされる）

```
警告: Ghostscript (gs) が見つかりません
  PDF最適化をスキップします（元のPDFを使用）
```

**解決方法**: PDF最適化機能を使用する場合は、Ghostscriptをインストール
- macOS: `brew install ghostscript`
- Linux: `sudo apt-get install ghostscript` または `sudo yum install ghostscript`

**注意**: GhostscriptがなくてもPDF生成は正常に動作します。最適化がスキップされるだけです。

### LaTeXコンパイルエラー

- 特殊文字（`_`など）がエスケープされていない
- 空の`description`環境

**解決方法**: `escape_latex()`メソッドで自動エスケープ、空の環境を回避

---

## PDF最適化について

PDF最適化機能により、生成されたPDFファイルのサイズを自動的に削減します。

- **削減率**: 通常30-50%のサイズ削減
- **品質**: 電子書籍用設定（約150dpi）で、画質とファイルサイズのバランスを最適化
- **互換性**: PDF 1.4形式で、広範な互換性を確保
- **フォールバック**: 最適化に失敗した場合、元のPDFを使用

GitHubリポジトリの容量制限（推奨1GB未満）を守るため、この機能を推奨します。

---

## ルールファイル

### HTML生成ルール
- **ファイル**: `.cursor/rules/hp-html-rules.mdc`
- **内容**: HTML構造、復習問題の形式、データ利用ルール

### TeX生成ルール
- **ファイル**: `.cursor/rules/hp-tex-rules.mdc`
- **内容**: TeXレイアウト仕様、セクション構造、PDF生成方法

---

## 今後の改善予定

### コンテンツ品質の向上
- **LLM API活用**: OpenAI API / Claude API / Gemini APIを使用
  - 要約・ポイント抽出の品質向上
  - 復習問題の自動生成
  - 板書・プリントの内容解析（Vision API）

### Examist連携
- **Examist参照**: https://examist.jp/ を参照して問題案を作成
- Webスクレイピング機能の追加
- 授業内容に基づいた問題の自動生成

### 機能追加
- 画像の自動挿入機能
- 画像の自動最適化機能
- バッチ処理機能（複数授業の一括生成）
- 数式の自動検出とLaTeX化

### UI/UX改善
- 検索機能の追加
- フィルタリング機能の追加
- ダークモード/ライトモードの切り替え

---

## 用語集

- **PLAUD NotePin**: 音声録音・テキスト化アプリ
- **Zapier**: 自動化ツール（PLAUD NotePin → Google Drive）
- **Examist**: 大学入試数学の学習サイト（https://examist.jp/）
- **GitHub Pages**: 静的サイトホスティングサービス
- **latexmk**: LaTeXコンパイル自動化ツール
- **Ghostscript**: PDF処理ツール

---

## 変更履歴

- **2025-11-27**: 初版作成
  - 基本機能の要件定義
  - HTML/TeX/PDF生成機能
  - PDF最適化機能
  - UI/UX要件（Math & Cyberテーマ）
  - 統一ヘッダー・フッター仕様の追加

- **2025-12-XX**: UI/UX改善
  - フォントファミリーの統一（Montserrat、Noto Sans JPを優先適用）
  - 授業ページのセクションスタイル追加（`.summary`, `.key-points`, `.review-questions`）
  - 授業ページのタイトル横に1〜40の授業へのナビゲーションボタンを追加
  - クラスページから授業ページへのリンク機能追加（「授業ログを見る」ボタン）
  - レスポンシブデザインの改善（モバイル表示時の最適化）
  - 板書・プリントの要点を本時のポイントに統合
  - MathJaxによる数式レンダリング対応

---

## 参考資料

- [.cursor/rules/hp-html-rules.mdc](../Tex/.cursor/rules/hp-html-rules.mdc): HTML生成ルール
- [.cursor/rules/hp-tex-rules.mdc](../Tex/.cursor/rules/hp-tex-rules.mdc): TeX生成ルール
- [Examist](https://examist.jp/): 大学入試数学の学習サイト
