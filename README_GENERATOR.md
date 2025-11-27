# 授業ログ自動生成ツール

Google Drive側の授業フォルダからデータを読み込み、HTML、TeX、PDFを自動生成するツールです。

## 機能

- Google Drive側の授業フォルダから音声テキスト、画像、PDFを読み込み
- 授業内容のポイントを自動抽出
- HTMLページを生成（授業内容のポイント＋復習問題）
- TeXファイルを生成（B5判、二段組）
- PDFを自動コンパイル（latexmk使用）

## セットアップ

### 1. 環境変数の設定

スクリプトを実行する前に、以下の環境変数を設定してください：

```bash
export KOUTECH_HP_BASE='/path/to/KouTechHP'
export KOUTECH_DRIVE_BASE='/path/to/Drive/Tex'  # オプション
```

### 2. スクリプトの配置

`generate_lesson.py`は外部（Google Drive側など）に配置することを推奨します。
リポジトリには含まれていません。

## 使用方法

```bash
python generate_lesson.py <drive_folder> <year> <class> <term> <lesson_num>
```

### パラメータ

- `drive_folder`: Google Drive側の授業フォルダパス（絶対パス）
- `year`: 年度（例: "2025"）
- `class`: クラス名（例: "1A"）
- `term`: 学期（例: "t1", "t2", "t3"）
- `lesson_num`: 授業番号（例: 1, 2, 3...）

### 使用例

```bash
# 環境変数を設定
export KOUTECH_HP_BASE='/path/to/KouTechHP'

# スクリプトを実行
python /path/to/generate_lesson.py "/path/to/lesson/folder" 2025 1A t1 1
```

## 入力データ（Google Drive側）

授業フォルダには以下を含める必要があります：

- **音声テキスト**: `.txt`ファイル（NotePin Proで生成された形式）
- **板書画像**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`ファイル
- **プリントPDF**: `.pdf`ファイル

## 出力

生成されたファイルは以下の場所に保存されます：

- **HTML**: `<KOUTECH_HP_BASE>/<year>/<Class>/<Term>/lessons/lesson_XX.html`
- **TeX**: `<KOUTECH_HP_BASE>/<year>/<Class>/<Term>/tex/lesson_XX.tex`
- **PDF**: `<KOUTECH_HP_BASE>/<year>/<Class>/<Term>/pdf/lesson_XX.pdf`

## 必要な環境

- Python 3.6以上
- LaTeX環境（uplatex、latexmk）
- 必要なLaTeXパッケージ（jsarticlek、emath、tcolorboxなど）

## 注意事項

- Google Drive側のrawデータ（音声テキスト、画像、PDF）は公開されません
- 公開されるのは生成されたHTML、TeX、PDFのみです
- フォルダ構造は変更しないでください
- スクリプトは個人情報を含む可能性があるため、外部に配置することを推奨します

## トラブルシューティング

### 環境変数が設定されていない

```
エラー: 環境変数 KOUTECH_HP_BASE が設定されていません
```

→ 環境変数を設定してください：
```bash
export KOUTECH_HP_BASE='/path/to/KouTechHP'
```

### latexmkが見つからない

```
エラー: latexmkが見つかりません。インストールしてください。
```

→ LaTeX環境をインストールしてください（MacTeX、TeX Liveなど）

## 今後の改善予定

- 復習問題の自動生成機能の強化
- 音声テキストからのより高度なポイント抽出
- 画像の自動挿入機能
- バッチ処理機能（複数授業の一括生成）
