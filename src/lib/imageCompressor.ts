/**
 * 이미지 압축 유틸리티
 *
 * 📌 브라우저에서 이미지를 압축해서 용량을 줄여요!
 *
 * 일상생활 비유:
 * - 큰 사진을 작은 액자에 맞게 줄이는 것과 같아요
 * - 원본 사진은 10MB인데, 액자에 맞게 1MB로 줄이면 저장 공간도 아끼고 빠르게 전송할 수 있죠!
 *
 * 작동 원리:
 * 1. 이미지를 Canvas(그림판)에 그림
 * 2. 크기가 1200px 초과하면 비율 유지하며 축소
 * 3. JPEG 80% 품질로 압축 (사람 눈에는 거의 차이 없음)
 * 4. Blob(파일 덩어리)으로 변환해서 반환
 */

// 📌 압축 설정값
const MAX_WIDTH = 1200 // 최대 가로 크기 (픽셀)
const MAX_HEIGHT = 1200 // 최대 세로 크기 (픽셀)
const QUALITY = 0.8 // JPEG 품질 (0~1, 0.8 = 80%)

/**
 * 이미지 파일을 압축합니다
 *
 * @param file - 원본 이미지 파일
 * @returns 압축된 이미지 파일 (JPEG 형식)
 *
 * 사용 예시:
 * ```typescript
 * const originalFile = event.target.files[0] // 5MB 이미지
 * const compressedFile = await compressImage(originalFile) // 약 300KB로 압축
 * ```
 */
export async function compressImage(file: File): Promise<File> {
  // 📌 이미지가 아니면 원본 그대로 반환
  if (!file.type.startsWith("image/")) {
    return file
  }

  // 📌 GIF는 압축하면 애니메이션이 사라지므로 원본 반환
  if (file.type === "image/gif") {
    return file
  }

  try {
    // 📌 이미지를 비트맵(픽셀 데이터)으로 로드
    // createImageBitmap: 브라우저 내장 함수로 이미지를 효율적으로 디코딩
    const img = await createImageBitmap(file)

    // 📌 원본 크기
    let { width, height } = img

    // 📌 크기가 최대치를 초과하면 비율 유지하며 축소
    // 예: 3000x2000 이미지 → 1200x800으로 축소
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    // 📌 Canvas(가상 그림판) 생성
    // Canvas: 웹에서 그림을 그릴 수 있는 HTML 요소
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    // 📌 Canvas에 이미지 그리기
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Canvas 컨텍스트를 생성할 수 없습니다")
    }
    ctx.drawImage(img, 0, 0, width, height)

    // 📌 Canvas 내용을 Blob(파일 덩어리)으로 변환
    // toBlob: Canvas 내용을 이미지 파일로 변환하는 함수
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("이미지 압축 실패"))
          }
        },
        "image/jpeg", // JPEG 형식으로 저장 (용량 효율적)
        QUALITY // 80% 품질
      )
    })

    // 📌 파일명에서 확장자를 .jpg로 변경
    const originalName = file.name
    const nameWithoutExt = originalName.replace(/\.[^.]+$/, "")
    const newFileName = `${nameWithoutExt}.jpg`

    // 📌 Blob을 File 객체로 변환해서 반환
    return new File([blob], newFileName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    })
  } catch (error) {
    // 📌 압축 실패 시 원본 반환
    console.warn("이미지 압축 실패, 원본 사용:", error)
    return file
  }
}

/**
 * 여러 이미지 파일을 한 번에 압축합니다
 *
 * @param files - 원본 이미지 파일 배열
 * @returns 압축된 이미지 파일 배열
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage))
}
