#!/usr/bin/env node

// statusline 스크립트 - stdin으로 JSON 데이터를 받아서 상태 표시줄 출력
const path = require('path');

let input = '';

process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const parts = [];

    // 1. 컨텍스트 사용량 (남은 용량)
    const usage = data.context_window?.current_usage;
    if (usage) {
      const current = usage.input_tokens +
                      usage.cache_creation_input_tokens +
                      usage.cache_read_input_tokens;
      const size = data.context_window.context_window_size;
      const pct = Math.floor((current * 100) / size);
      const remainK = Math.floor((size - current) / 1000);
      parts.push(`Context: ${pct}% (${remainK}k left)`);
    }

    // 2. 사용 중인 모델
    if (data.model?.display_name) {
      parts.push(`Model: ${data.model.display_name}`);
    }

    // 3. Claude Code 버전
    if (data.version) {
      parts.push(`v${data.version}`);
    }

    // 4. 총 입/출력 토큰 수
    const totalIn = Math.floor(data.context_window?.total_input_tokens / 1000) || 0;
    const totalOut = Math.floor(data.context_window?.total_output_tokens / 1000) || 0;
    parts.push(`Tokens: ${totalIn}k in / ${totalOut}k out`);

    // 5. 세션 시간
    if (data.cost?.total_duration_ms) {
      const totalSec = Math.floor(data.cost.total_duration_ms / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      parts.push(`Time: ${min}m ${sec}s`);
    }

    // 6. 추가/삭제된 코드 줄 수
    if (data.cost) {
      const added = data.cost.total_lines_added || 0;
      const removed = data.cost.total_lines_removed || 0;
      parts.push(`Lines: +${added} / -${removed}`);
    }

    // 7. 출력 스타일
    if (data.output_style?.name) {
      parts.push(`Style: ${data.output_style.name}`);
    }

    // 8. 현재 작업 디렉토리 (폴더명만 표시)
    if (data.workspace?.current_dir) {
      const currentFolder = path.basename(data.workspace.current_dir);
      parts.push(`Dir: ${currentFolder}`);
    }

    // 9. 프로젝트 디렉토리 (폴더명만 표시)
    if (data.workspace?.project_dir) {
      const projectFolder = path.basename(data.workspace.project_dir);
      parts.push(`Project: ${projectFolder}`);
    }

    console.log(parts.join(' | '));
  } catch (e) {
    console.log('statusline error');
  }
});
