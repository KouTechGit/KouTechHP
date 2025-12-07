#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
course_data.jsonのすべての動画にdescriptionフィールドを追加するスクリプト
既にdescriptionフィールドが存在する場合はスキップします
"""

import json
import sys

def add_description_field(json_file_path):
    """JSONファイルのすべての動画にdescriptionフィールドを追加"""
    try:
        # JSONファイルを読み込む
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 各科目の各単元の各動画にdescriptionフィールドを追加
        count = 0
        for subject in data.get('subjects', []):
            for unit in subject.get('units', []):
                for video in unit.get('videos', []):
                    if 'description' not in video:
                        video['description'] = ''
                        count += 1
        
        # JSONファイルに書き戻す
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f'✅ {count}個の動画にdescriptionフィールドを追加しました。')
        return True
        
    except FileNotFoundError:
        print(f'❌ エラー: ファイルが見つかりません: {json_file_path}')
        return False
    except json.JSONDecodeError as e:
        print(f'❌ エラー: JSONの解析に失敗しました: {e}')
        return False
    except Exception as e:
        print(f'❌ エラー: {e}')
        return False

if __name__ == '__main__':
    json_file = 'course_data.json'
    if len(sys.argv) > 1:
        json_file = sys.argv[1]
    
    print(f'📝 {json_file} を処理中...')
    success = add_description_field(json_file)
    
    if success:
        print('✨ 処理が完了しました。')
    else:
        print('⚠️  処理中にエラーが発生しました。')
        sys.exit(1)

