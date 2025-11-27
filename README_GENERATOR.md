# 授業ログ自動生成ツール

Google Drive側の授業フォルダからデータを読み込み、HTML、TeX、PDFを自動生成するツールです。

## 機能

- Google Drive側の授業フォルダから音声テキスト、画像、PDFを読み込み
- 授業内容のポイントを自動抽出
- HTMLページを生成（授業内容のポイント＋復習問題）
- TeXファイルを生成（B5判、二段組）
- PDFを自動コンパイル（latexmk使用）
- **PDF最適化機能**（Ghostscript使用）
  - 自動的にPDFファイルサイズを削減（通常30-50%削減）
  - GitHubリポジトリの容量制限対策
  - 最適化に失敗した場合は元のPDFを使用（フォールバック機能）

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

- **音声テキスト**: `.txt`ファイル（PLAUD NotePinで生成された形式）
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
- **Ghostscript**（PDF最適化用、オプション）
  - インストールされていない場合、最適化はスキップされ、元のPDFが使用されます
  - macOS: `brew install ghostscript`
  - Linux: `sudo apt-get install ghostscript` または `sudo yum install ghostscript`

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

### Ghostscriptが見つからない（PDF最適化がスキップされる）

```
警告: Ghostscript (gs) が見つかりません
  PDF最適化をスキップします（元のPDFを使用）
```

→ PDF最適化機能を使用する場合は、Ghostscriptをインストールしてください：
- macOS: `brew install ghostscript`
- Linux: `sudo apt-get install ghostscript` または `sudo yum install ghostscript`

**注意**: GhostscriptがなくてもPDF生成は正常に動作します。最適化がスキップされるだけです。

## PDF最適化について

PDF最適化機能により、生成されたPDFファイルのサイズを自動的に削減します。

- **削減率**: 通常30-50%のサイズ削減
- **品質**: 電子書籍用設定（約150dpi）で、画質とファイルサイズのバランスを最適化
- **互換性**: PDF 1.4形式で、広範な互換性を確保

GitHubリポジトリの容量制限（推奨1GB未満）を守るため、この機能を推奨します。

## 今後の改善予定

- 復習問題の自動生成機能の強化
- 音声テキストからのより高度なポイント抽出
- 画像の自動挿入機能
- バッチ処理機能（複数授業の一括生成）
- 画像の自動最適化機能
