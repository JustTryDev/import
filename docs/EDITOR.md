# 에디터 가이드

TipTap 기반의 RichTextEditor 사용법입니다.

## RichTextEditor

고급 텍스트 편집 기능을 제공하는 에디터입니다.

### 포함된 기능

- **텍스트 서식**: 굵게, 기울임, 밑줄, 취소선
- **제목**: H1, H2, H3
- **목록**: 순서 있는/없는 목록
- **인용구**: 블록 인용
- **코드**: 인라인 코드, 코드 블록
- **링크**: URL 링크 삽입
- **이미지**: 이미지 업로드 및 삽입
- **이미지 갤러리**: 여러 이미지를 갤러리로 표시
- **이미지 슬라이더**: 이미지 슬라이드쇼
- **정렬**: 왼쪽, 가운데, 오른쪽 정렬

### 기본 사용법

```tsx
import { RichTextEditor } from '@/components/ui/RichTextEditor'

function MyPage() {
  const [content, setContent] = useState('')

  const handleChange = (html: string) => {
    setContent(html)
    console.log('에디터 내용:', html)
  }

  return (
    <RichTextEditor
      content={content}
      onChange={handleChange}
      placeholder="내용을 입력하세요..."
    />
  )
}
```

### Props

| Prop | 타입 | 설명 |
|------|-----|------|
| `content` | `string` | HTML 콘텐츠 |
| `onChange` | `(html: string) => void` | 내용 변경 핸들러 |
| `placeholder` | `string` | 플레이스홀더 텍스트 |
| `editable` | `boolean` | 편집 가능 여부 (기본: true) |
| `className` | `string` | 추가 CSS 클래스 |

### 이미지 업로드 설정

에디터에서 이미지 업로드를 사용하려면 업로드 함수를 전달하세요:

```tsx
const handleImageUpload = async (file: File): Promise<string> => {
  // 서버에 이미지 업로드
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  const { url } = await response.json()
  return url  // 업로드된 이미지 URL 반환
}

<RichTextEditor
  content={content}
  onChange={handleChange}
  onImageUpload={handleImageUpload}
/>
```

---

## RichTextViewer

에디터에서 작성한 HTML 콘텐츠를 안전하게 표시합니다.

### 사용법

```tsx
import { RichTextViewer } from '@/components/ui/RichTextViewer'

function PostDetail({ post }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <RichTextViewer content={post.content} />
    </article>
  )
}
```

### Props

| Prop | 타입 | 설명 |
|------|-----|------|
| `content` | `string` | HTML 콘텐츠 |
| `className` | `string` | 추가 CSS 클래스 |

### 보안

RichTextViewer는 DOMPurify를 사용하여 XSS 공격을 방지합니다.
악성 스크립트가 포함된 HTML도 안전하게 표시됩니다.

---

## 이미지 갤러리 확장

여러 이미지를 그리드 형태로 표시합니다.

### 에디터에서 사용

1. 에디터 툴바에서 "갤러리" 버튼 클릭
2. 이미지들 선택
3. 갤러리로 삽입됨

### 생성되는 HTML 구조

```html
<div class="image-gallery" data-gallery="true">
  <img src="image1.jpg" alt="" />
  <img src="image2.jpg" alt="" />
  <img src="image3.jpg" alt="" />
</div>
```

---

## 이미지 슬라이더 확장

이미지를 슬라이드쇼 형태로 표시합니다.

### 에디터에서 사용

1. 에디터 툴바에서 "슬라이더" 버튼 클릭
2. 이미지들 선택
3. 슬라이더로 삽입됨

### 생성되는 HTML 구조

```html
<div class="image-slider" data-slider="true">
  <img src="image1.jpg" alt="" />
  <img src="image2.jpg" alt="" />
  <img src="image3.jpg" alt="" />
</div>
```

### Swiper 의존성

슬라이더는 Swiper 라이브러리를 사용합니다.
이미 package.json에 포함되어 있습니다.

---

## 스타일 커스터마이징

에디터 스타일은 `globals.css`에서 수정할 수 있습니다:

```css
/* 에디터 컨테이너 */
.ProseMirror {
  min-height: 200px;
  padding: 1rem;
}

/* 에디터 포커스 */
.ProseMirror:focus {
  outline: none;
}

/* 플레이스홀더 */
.ProseMirror p.is-editor-empty:first-child::before {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

/* 이미지 스타일 */
.ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

/* 코드 블록 */
.ProseMirror pre {
  background: #1e1e1e;
  color: #fff;
  padding: 1rem;
  border-radius: 0.5rem;
}
```

---

## 폼과 함께 사용

React Hook Form과 함께 사용하는 예시:

```tsx
import { useForm, Controller } from 'react-hook-form'
import { RichTextEditor } from '@/components/ui/RichTextEditor'

interface FormData {
  title: string
  content: string
}

function PostForm() {
  const { control, handleSubmit } = useForm<FormData>()

  const onSubmit = (data: FormData) => {
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        name="content"
        control={control}
        rules={{ required: '내용을 입력하세요' }}
        render={({ field }) => (
          <RichTextEditor
            content={field.value}
            onChange={field.onChange}
            placeholder="내용을 입력하세요..."
          />
        )}
      />

      <button type="submit">저장</button>
    </form>
  )
}
```

---

## 주의사항

1. **서버 사이드 렌더링**: 에디터는 클라이언트에서만 렌더링됩니다 (`"use client"` 사용)
2. **이미지 업로드**: 별도의 업로드 API가 필요합니다
3. **콘텐츠 저장**: HTML 문자열로 저장하고 RichTextViewer로 표시하세요
