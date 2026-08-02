# AI 일정 재설계

예상치 못한 상황으로 하루 계획이 틀어졌을 때, AI가 기존 일정을 분석해 남은 일정을 다시 설계해 주는 서비스입니다.

사용자가 현재 일정과 상황을 입력하면 AI가 서로 다른 3가지 재설계안을 제안합니다. 사용자는 기존 일정과 변경 내용을 비교한 뒤 원하는 안만 선택해 적용하거나, 적용한 결과를 다시 되돌릴 수 있습니다.

## 배포 주소

[AI 일정 재설계 서비스 바로가기](https://frontend-pi-lovat-solbf8arez.vercel.app)

## 주요 기능

- 주간 캘린더 일정 추가·수정·삭제
- 기상 시간과 취침 시간에 맞춘 시간표 표시
- 자연어 상황 입력을 통한 AI 일정 재설계
- 기존 일정과 AI 제안 일정 비교
- 변경된 일정만 선별한 변경 이유 및 전후 시간 표시
- 3가지 재설계안 중 선택 적용
- 최근 AI 재설계 되돌리기
- 일정과 최근 제안의 브라우저 `localStorage` 저장
- 기존 일정 누락을 방지하는 응답 병합 및 검증

## 기술 스택

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Zod
- OpenAI API

## 실행 방법

```bash
cd frontend
npm install
```

`frontend/.env.local` 파일을 만들고 OpenAI API 키를 설정합니다.

```env
OPENAI_API_KEY=your_api_key
# 선택 사항
OPENAI_MODEL=gpt-4o
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)에 접속합니다.

## 주요 데이터 구조

일정은 다음 필드로 구성됩니다.

```ts
interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: "low" | "medium" | "high" | "fixed";
}
```

AI 응답은 `options` 배열에 정확히 3개의 재설계안을 포함하며, 각 안에는 전체 재설계 일정과 실제 변경 내역이 들어갑니다.

## 검증

```bash
cd frontend
npm run build
```

## Vercel 배포

프로젝트는 Vercel에 배포되어 있습니다. Vercel 프로젝트의 Root Directory는 `frontend`를 기준으로 하며, AI 재설계 API를 사용하려면 다음 환경 변수를 Production 환경에 등록해야 합니다.

```env
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o # 선택 사항
```

환경 변수를 추가하거나 변경한 뒤에는 새 프로덕션 배포가 필요합니다.
