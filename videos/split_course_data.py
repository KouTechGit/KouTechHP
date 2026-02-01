#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
course_data.jsonを単元ごとに分割するスクリプト

使用方法:
    python split_course_data.py

出力:
    - videos/course_data/科目名/単元名.json (各単元のデータ)
    - videos/course_data_index.json (全単元のインデックス)
"""

import json
import os
from pathlib import Path

def sanitize_filename(filename):
    """
    ファイル名に使用できない文字を置き換える
    """
    # Windows/Linux/Macで使用できない文字を置き換え
    invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    sanitized = filename
    for char in invalid_chars:
        sanitized = sanitized.replace(char, '_')
    return sanitized

def split_course_data():
    """
    course_data.jsonを単元ごとに分割する
    """
    # パスの設定
    script_dir = Path(__file__).parent
    input_file = script_dir / 'course_data.json'
    output_dir = script_dir / 'course_data'
    index_file = script_dir / 'course_data_index.json'
    
    # 入力ファイルの確認
    if not input_file.exists():
        print(f"エラー: {input_file} が見つかりません")
        return
    
    # 出力ディレクトリの作成
    output_dir.mkdir(exist_ok=True)
    
    # JSONファイルの読み込み
    print(f"読み込み中: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if not data or 'subjects' not in data:
        print("エラー: 無効なデータ形式です")
        return
    
    # インデックスデータの準備
    index_data = {
        "subjects": []
    }
    
    # 各科目・各単元を処理
    for subject in data['subjects']:
        subject_name = subject['subject_name']
        sanitized_subject_name = sanitize_filename(subject_name)
        subject_dir = output_dir / sanitized_subject_name
        subject_dir.mkdir(exist_ok=True)
        
        print(f"\n科目: {subject_name}")
        
        # インデックス用の科目データ
        index_subject = {
            "subject_name": subject_name,
            "units": []
        }
        
        # 各単元を処理
        for unit in subject['units']:
            unit_name = unit['unit_name']
            sanitized_unit_name = sanitize_filename(unit_name)
            unit_file = subject_dir / f"{sanitized_unit_name}.json"
            
            # 単元データの作成
            unit_data = {
                "subject_name": subject_name,
                "unit_name": unit_name,
                "videos": unit['videos']
            }
            
            # materialsフィールドがある場合は追加
            if 'materials' in unit:
                unit_data['materials'] = unit['materials']
            
            # 単元ファイルの保存
            with open(unit_file, 'w', encoding='utf-8') as f:
                json.dump(unit_data, f, ensure_ascii=False, indent=2)
            
            print(f"  単元: {unit_name} -> {unit_file}")
            
            # インデックスに追加（動画数も含める）
            index_subject['units'].append({
                "unit_name": unit_name,
                "file_path": f"course_data/{sanitized_subject_name}/{sanitized_unit_name}.json",
                "video_count": len(unit['videos'])
            })
        
        index_data['subjects'].append(index_subject)
    
    # インデックスファイルの保存
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nインデックスファイルを生成しました: {index_file}")
    print("\n分割完了！")

if __name__ == '__main__':
    split_course_data()
