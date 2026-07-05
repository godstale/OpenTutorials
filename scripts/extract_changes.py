import json
import os

transcript_path = r"C:\Users\godst\.gemini\antigravity-cli\brain\2868d8ef-be9e-444e-9778-7f080ded4f57\.system_generated\logs\transcript.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        if data.get('type') == 'PLANNER_RESPONSE' and data.get('tool_calls'):
            for call in data['tool_calls']:
                if call.get('name') == 'replace_file_content':
                    args = call.get('args', {})
                    target_file = args.get('TargetFile', '')
                    if 'client.tsx' in target_file:
                        replacement = args.get('ReplacementContent', '')
                        if 'ReactPlayer' in replacement or 'videoInfo' in replacement or 'subtitles' in replacement:
                            print("=" * 60)
                            print("Instruction:", args.get('Instruction'))
                            print("StartLine:", args.get('StartLine'), "EndLine:", args.get('EndLine'))
                            print("-" * 30 + " TARGET " + "-" * 30)
                            print(args.get('TargetContent'))
                            print("-" * 30 + " REPLACEMENT " + "-" * 30)
                            print(args.get('ReplacementContent'))
                            print("=" * 60)
                            print("\n")
