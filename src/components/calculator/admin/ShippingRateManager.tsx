"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, Trash2, Pencil, Check, X, Upload, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as XLSX from "xlsx"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useShippingCompanies,
  useShippingRateTypes,
  useShippingRates,
} from "@/hooks"
import { Id } from "../../../../convex/_generated/dataModel"

// 테이블 행 타입 정의
// id가 null이면 새 행, 아니면 기존 데이터
interface TableRow {
  id: Id<"internationalShippingRates"> | null
  cbm: string
  rate: string
  originalCbm?: number  // 변경 감지용 (기존 데이터의 원래 값)
  originalRate?: number
}

// 셀 위치 타입 (row: 행 인덱스, col: 'cbm' 또는 'rate')
interface CellPosition {
  row: number
  col: "cbm" | "rate"
}

// 숫자 문자열에서 쉼표 제거 및 숫자만 추출
// 예: "1,000" → "1000", "1,234.56" → "1234.56"
function cleanNumber(value: string): string {
  // 쉼표 제거 후 숫자와 소수점만 남김
  return value.replace(/,/g, "").replace(/[^\d.]/g, "")
}

// 선택 범위 계산 함수
function getSelectedRange(start: CellPosition, end: CellPosition): Set<string> {
  const selected = new Set<string>()
  const minRow = Math.min(start.row, end.row)
  const maxRow = Math.max(start.row, end.row)
  const cols: ("cbm" | "rate")[] = ["cbm", "rate"]
  const startColIdx = cols.indexOf(start.col)
  const endColIdx = cols.indexOf(end.col)
  const minCol = Math.min(startColIdx, endColIdx)
  const maxCol = Math.max(startColIdx, endColIdx)

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      selected.add(`${r}-${cols[c]}`)
    }
  }
  return selected
}

// 운임 요금 관리 컴포넌트
export function ShippingRateManager() {
  const { companies, isLoading: companiesLoading } = useShippingCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<Id<"shippingCompanies"> | null>(null)
  const [selectedRateTypeId, setSelectedRateTypeId] = useState<Id<"shippingRateTypes"> | null>(null)

  const {
    rateTypes,
    isLoading: rateTypesLoading,
    createRateType,
    updateRateType,
    removeRateType,
  } = useShippingRateTypes(selectedCompanyId)

  const {
    rates,
    isLoading: ratesLoading,
    createRate,
    updateRate,
    removeRate,
    removeAllRates,
  } = useShippingRates(selectedRateTypeId)

  // 새 운임 타입 상태
  const [isAddingType, setIsAddingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [newTypeCurrency, setNewTypeCurrency] = useState<"USD" | "CNY" | "KRW">("USD")

  // 운임 타입 편집 상태
  const [editingTypeId, setEditingTypeId] = useState<Id<"shippingRateTypes"> | null>(null)
  const [editingTypeName, setEditingTypeName] = useState("")
  const [editingTypeCurrency, setEditingTypeCurrency] = useState<"USD" | "CNY" | "KRW">("USD")

  // 요금 테이블 행 상태 (기존 데이터 + 빈 행)
  const [tableRows, setTableRows] = useState<TableRow[]>([])

  // 셀 선택 상태 (엑셀처럼 드래그 선택)
  const [selectionStart, setSelectionStart] = useState<CellPosition | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<CellPosition | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const tableRef = useRef<HTMLTableElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 행 선택 상태 (행 번호 클릭으로 전체 행 선택)
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set())
  const [lastSelectedRowIndex, setLastSelectedRowIndex] = useState<number | null>(null)

  // 선택된 셀 범위 계산
  const selectedCells = selectionStart && selectionEnd
    ? getSelectedRange(selectionStart, selectionEnd)
    : new Set<string>()

  // 첫 번째 업체 자동 선택
  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0]._id)
    }
  }, [companies, selectedCompanyId])

  // 첫 번째 운임 타입 자동 선택
  useEffect(() => {
    if (rateTypes && rateTypes.length > 0 && !selectedRateTypeId) {
      setSelectedRateTypeId(rateTypes[0]._id)
    }
  }, [rateTypes, selectedRateTypeId])

  // 업체 변경 시 운임 타입 초기화
  useEffect(() => {
    setSelectedRateTypeId(null)
  }, [selectedCompanyId])

  // rates 데이터가 변경되면 tableRows 동기화
  // 기존 데이터를 Input용 문자열로 변환하고, 빈 행 2개 추가
  useEffect(() => {
    if (rates === undefined) return

    const existingRows: TableRow[] = rates.map((rate) => {
      // 기존 데이터(rateUSD)와 새 데이터(rate) 호환성 처리
      const rateValue = (rate as { rate?: number; rateUSD?: number }).rate
        ?? (rate as { rate?: number; rateUSD?: number }).rateUSD
        ?? 0

      return {
        id: rate._id,
        cbm: rate.cbm.toString(),
        rate: rateValue.toString(),
        originalCbm: rate.cbm,
        originalRate: rateValue,
      }
    })

    // 빈 행 2개 추가
    const emptyRows: TableRow[] = [
      { id: null, cbm: "", rate: "" },
      { id: null, cbm: "", rate: "" },
    ]

    setTableRows([...existingRows, ...emptyRows])
  }, [rates])

  // 운임 타입 추가
  const handleAddRateType = async () => {
    if (!selectedCompanyId || !newTypeName.trim()) return
    await createRateType({
      companyId: selectedCompanyId,
      name: newTypeName.trim(),
      currency: newTypeCurrency,
      isDefault: false,
      sortOrder: (rateTypes?.length ?? 0) + 1,
    })
    setNewTypeName("")
    setNewTypeCurrency("USD")
    setIsAddingType(false)
  }

  // 운임 타입 삭제
  const handleDeleteRateType = async () => {
    if (!selectedRateTypeId) return
    if (!confirm("이 운임 타입과 관련 요금표를 삭제하시겠습니까?")) return
    await removeAllRates({ rateTypeId: selectedRateTypeId })
    await removeRateType({ id: selectedRateTypeId })
    setSelectedRateTypeId(null)
  }

  // 운임 타입 편집 시작
  const handleStartEditType = (
    typeId: Id<"shippingRateTypes">,
    currentName: string,
    currentCurrency?: "USD" | "CNY" | "KRW"
  ) => {
    setEditingTypeId(typeId)
    setEditingTypeName(currentName)
    setEditingTypeCurrency(currentCurrency ?? "USD")
  }

  // 운임 타입 편집 저장
  const handleSaveEditType = async () => {
    if (!editingTypeId || !editingTypeName.trim()) return
    await updateRateType({
      id: editingTypeId,
      name: editingTypeName.trim(),
      currency: editingTypeCurrency,
    })
    setEditingTypeId(null)
    setEditingTypeName("")
    setEditingTypeCurrency("USD")
  }

  // 운임 타입 편집 취소
  const handleCancelEditType = () => {
    setEditingTypeId(null)
    setEditingTypeName("")
    setEditingTypeCurrency("USD")
  }

  // 테이블 행 값 변경 (로컬 상태만 업데이트)
  const handleRowChange = (index: number, field: "cbm" | "rate", value: string) => {
    const newRows = [...tableRows]
    newRows[index] = { ...newRows[index], [field]: value }
    setTableRows(newRows)
  }

  // 테이블 행 포커스 아웃 시 자동 저장/추가
  const handleRowBlur = useCallback(async (index: number) => {
    if (!selectedRateTypeId) return

    const row = tableRows[index]
    const cbm = parseFloat(row.cbm)
    const rate = parseFloat(row.rate)

    // 빈 행이면 무시
    if (!row.cbm.trim() && !row.rate.trim()) return

    // 유효하지 않은 값이면 무시
    if (isNaN(cbm) || cbm <= 0 || isNaN(rate) || rate < 0) return

    if (row.id) {
      // 기존 데이터: 변경된 경우에만 업데이트
      const hasChanged = row.originalCbm !== cbm || row.originalRate !== rate
      if (hasChanged) {
        await updateRate({
          id: row.id,
          cbm,
          rate,
        })
      }
    } else {
      // 새 행: CBM과 요금 모두 입력된 경우 추가
      if (row.cbm.trim() && row.rate.trim()) {
        await createRate({
          rateTypeId: selectedRateTypeId,
          cbm,
          rate,
        })
      }
    }
  }, [tableRows, selectedRateTypeId, updateRate, createRate])

  // 빈 행 추가
  const handleAddEmptyRow = () => {
    setTableRows([...tableRows, { id: null, cbm: "", rate: "" }])
  }

  // 셀 선택 시작 (마우스 다운)
  const handleCellMouseDown = (row: number, col: "cbm" | "rate") => {
    setSelectionStart({ row, col })
    setSelectionEnd({ row, col })
    setIsDragging(true)
  }

  // 셀 위로 드래그 (마우스 엔터)
  const handleCellMouseEnter = (row: number, col: "cbm" | "rate") => {
    if (isDragging) {
      setSelectionEnd({ row, col })
    }
  }

  // 드래그 종료 (마우스 업)
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 전역 마우스업 이벤트 (테이블 밖에서 마우스 떼도 드래그 종료)
  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseUp])

  // 선택된 셀 복사 (Ctrl+C)
  const handleCopy = useCallback(() => {
    if (selectedCells.size === 0 || !selectionStart || !selectionEnd) return

    const minRow = Math.min(selectionStart.row, selectionEnd.row)
    const maxRow = Math.max(selectionStart.row, selectionEnd.row)
    const cols: ("cbm" | "rate")[] = ["cbm", "rate"]
    const startColIdx = cols.indexOf(selectionStart.col)
    const endColIdx = cols.indexOf(selectionEnd.col)
    const minCol = Math.min(startColIdx, endColIdx)
    const maxCol = Math.max(startColIdx, endColIdx)

    const lines: string[] = []
    for (let r = minRow; r <= maxRow; r++) {
      const row = tableRows[r]
      if (!row) continue
      const values: string[] = []
      for (let c = minCol; c <= maxCol; c++) {
        values.push(row[cols[c]])
      }
      lines.push(values.join("\t"))
    }

    const text = lines.join("\n")
    navigator.clipboard.writeText(text)
  }, [selectedCells, selectionStart, selectionEnd, tableRows])

  // 선택된 셀 데이터 삭제 (Delete 키)
  // 확인 창 없이 바로 삭제 (엑셀처럼 빠른 조작)
  const handleDeleteSelectedCells = useCallback(async () => {
    if (selectedCells.size === 0 || !selectionStart || !selectionEnd) return

    const minRow = Math.min(selectionStart.row, selectionEnd.row)
    const maxRow = Math.max(selectionStart.row, selectionEnd.row)
    const cols: ("cbm" | "rate")[] = ["cbm", "rate"]
    const startColIdx = cols.indexOf(selectionStart.col)
    const endColIdx = cols.indexOf(selectionEnd.col)
    const minCol = Math.min(startColIdx, endColIdx)
    const maxCol = Math.max(startColIdx, endColIdx)

    const newRows = [...tableRows]
    const rowsToDelete: Id<"internationalShippingRates">[] = []

    for (let r = minRow; r <= maxRow; r++) {
      const row = newRows[r]
      if (!row) continue

      // 선택된 열의 데이터 삭제 (빈 문자열로 설정)
      for (let c = minCol; c <= maxCol; c++) {
        newRows[r] = { ...newRows[r], [cols[c]]: "" }
      }

      // 두 열 모두 비어있고 기존 데이터면 행 삭제 후보
      if (!newRows[r].cbm.trim() && !newRows[r].rate.trim() && row.id) {
        rowsToDelete.push(row.id)
      }
    }

    // 로컬 상태 업데이트: 기존 데이터이고 둘 다 비었으면 제외
    const filteredRows = newRows.filter((row) => {
      if (row.id && !row.cbm.trim() && !row.rate.trim()) {
        return false
      }
      return true
    })

    // 빈 행이 하나도 없으면 추가
    if (filteredRows.every((r) => r.id !== null)) {
      filteredRows.push({ id: null, cbm: "", rate: "" })
    }

    setTableRows(filteredRows)

    // 백엔드에서 삭제
    for (const id of rowsToDelete) {
      await removeRate({ id })
    }

    // 선택 초기화
    setSelectionStart(null)
    setSelectionEnd(null)
  }, [selectedCells, selectionStart, selectionEnd, tableRows, removeRate])

  // 행 번호 클릭으로 행 선택 (Shift+클릭으로 범위 선택)
  const handleRowSelect = useCallback((rowIndex: number, e: React.MouseEvent) => {
    // 셀 선택 초기화
    setSelectionStart(null)
    setSelectionEnd(null)

    if (e.shiftKey && lastSelectedRowIndex !== null) {
      // Shift+클릭: 범위 선택
      const start = Math.min(lastSelectedRowIndex, rowIndex)
      const end = Math.max(lastSelectedRowIndex, rowIndex)
      const newSelection = new Set<number>()
      for (let i = start; i <= end; i++) {
        newSelection.add(i)
      }
      setSelectedRowIndices(newSelection)
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl+클릭: 토글 선택
      const newSelection = new Set(selectedRowIndices)
      if (newSelection.has(rowIndex)) {
        newSelection.delete(rowIndex)
      } else {
        newSelection.add(rowIndex)
      }
      setSelectedRowIndices(newSelection)
      setLastSelectedRowIndex(rowIndex)
    } else {
      // 일반 클릭: 단일 선택
      setSelectedRowIndices(new Set([rowIndex]))
      setLastSelectedRowIndex(rowIndex)
    }
  }, [lastSelectedRowIndex, selectedRowIndices])

  // 선택된 행 일괄 삭제
  const handleDeleteSelectedRows = useCallback(async () => {
    if (selectedRowIndices.size === 0) return

    const rowsToDelete: Id<"internationalShippingRates">[] = []
    const indicesToRemove = Array.from(selectedRowIndices).sort((a, b) => b - a) // 역순 정렬

    // 삭제할 ID 수집
    for (const idx of indicesToRemove) {
      const row = tableRows[idx]
      if (row && row.id) {
        rowsToDelete.push(row.id)
      }
    }

    // 로컬 상태에서 제거
    const newRows = tableRows.filter((_, idx) => !selectedRowIndices.has(idx))

    // 빈 행이 하나도 없으면 추가
    if (newRows.every((r) => r.id !== null)) {
      newRows.push({ id: null, cbm: "", rate: "" })
    }

    setTableRows(newRows)
    setSelectedRowIndices(new Set())
    setLastSelectedRowIndex(null)

    // 백엔드에서 삭제
    for (const id of rowsToDelete) {
      await removeRate({ id })
    }
  }, [selectedRowIndices, tableRows, removeRate])

  // 엑셀 템플릿 다운로드
  const handleDownloadTemplate = useCallback(() => {
    // 샘플 데이터가 포함된 템플릿 생성
    const templateData = [
      { CBM: 0.5, "요금": 85 },
      { CBM: 1, "요금": 110 },
      { CBM: 1.5, "요금": 130 },
      { CBM: 2, "요금": 150 },
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "운임요금")

    // 열 너비 설정
    ws["!cols"] = [{ wch: 10 }, { wch: 15 }]

    XLSX.writeFile(wb, "운임요금_템플릿.xlsx")
  }, [])

  // 엑셀 파일 업로드 처리
  const handleExcelUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedRateTypeId) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<{ CBM?: number; cbm?: number; "요금"?: number; rate?: number }>(sheet)

        // 파싱된 데이터로 행 추가
        const newRows: TableRow[] = [...tableRows.filter((r) => r.id !== null)] // 기존 데이터만 유지

        for (const row of jsonData) {
          const cbm = row.CBM ?? row.cbm
          const rate = row["요금"] ?? row.rate

          if (cbm !== undefined && rate !== undefined) {
            // 새 행으로 추가
            newRows.push({
              id: null,
              cbm: cleanNumber(String(cbm)),
              rate: cleanNumber(String(rate)),
            })
          }
        }

        // 빈 행 2개 추가
        newRows.push({ id: null, cbm: "", rate: "" })
        newRows.push({ id: null, cbm: "", rate: "" })

        setTableRows(newRows)

        // 새로 추가된 데이터 저장
        for (const row of jsonData) {
          const cbm = row.CBM ?? row.cbm
          const rate = row["요금"] ?? row.rate

          if (cbm !== undefined && rate !== undefined && cbm > 0 && rate >= 0) {
            await createRate({
              rateTypeId: selectedRateTypeId,
              cbm: Number(cbm),
              rate: Number(rate),
            })
          }
        }

        alert(`${jsonData.length}개의 요금이 업로드되었습니다.`)
      } catch (error) {
        console.error("엑셀 파싱 오류:", error)
        alert("엑셀 파일을 읽는 중 오류가 발생했습니다.")
      }
    }

    reader.readAsArrayBuffer(file)

    // input 초기화 (같은 파일 다시 선택 가능하게)
    e.target.value = ""
  }, [selectedRateTypeId, tableRows, createRate])

  // 선택된 셀에 붙여넣기 (Ctrl+V) - 셀 선택 상태에서 동작
  const handleGlobalPaste = useCallback(async (e: ClipboardEvent) => {
    // input에 포커스가 있으면 기본 붙여넣기 사용 (handlePaste가 처리)
    if (document.activeElement?.tagName === "INPUT") return

    if (!selectionStart || !selectedRateTypeId) return

    const pastedText = e.clipboardData?.getData("text")
    if (!pastedText) return

    e.preventDefault()

    const lines = pastedText.trim().split(/\r?\n/)
    const parsedRows: { cbm: string; rate: string }[] = []

    for (const line of lines) {
      const parts = line.trim().split(/\t+/)
      if (parts.length >= 2) {
        // 쉼표 제거 후 숫자만 추출 (예: "1,000" → "1000")
        parsedRows.push({ cbm: cleanNumber(parts[0]), rate: cleanNumber(parts[1]) })
      } else if (parts.length === 1 && parts[0].trim()) {
        if (selectionStart.col === "cbm") {
          parsedRows.push({ cbm: cleanNumber(parts[0]), rate: "" })
        } else {
          parsedRows.push({ cbm: "", rate: cleanNumber(parts[0]) })
        }
      }
    }

    if (parsedRows.length === 0) return

    const newRows = [...tableRows]
    const startRow = selectionStart.row

    // 기존 행과 새 행 모두에 붙여넣기 가능
    for (let i = 0; i < parsedRows.length; i++) {
      const targetIndex = startRow + i
      if (targetIndex < newRows.length) {
        // 기존 행이든 빈 행이든 덮어쓰기
        newRows[targetIndex] = {
          ...newRows[targetIndex],
          cbm: parsedRows[i].cbm || newRows[targetIndex].cbm,
          rate: parsedRows[i].rate || newRows[targetIndex].rate,
        }
      } else {
        // 행이 부족하면 새 행 추가
        newRows.push({ id: null, cbm: parsedRows[i].cbm, rate: parsedRows[i].rate })
      }
    }

    // 빈 행 2개 추가 (입력 편의)
    newRows.push({ id: null, cbm: "", rate: "" })
    newRows.push({ id: null, cbm: "", rate: "" })
    setTableRows(newRows)

    // 자동 저장: 기존 데이터는 update, 새 데이터는 create
    for (let i = 0; i < parsedRows.length; i++) {
      const cbm = parseFloat(parsedRows[i].cbm)  // 이미 cleanNumber 적용됨
      const rate = parseFloat(parsedRows[i].rate)
      if (isNaN(cbm) || cbm <= 0 || isNaN(rate) || rate < 0) continue

      const targetIndex = startRow + i
      const targetRow = newRows[targetIndex]

      if (targetRow && targetRow.id) {
        // 기존 데이터: 변경된 경우에만 업데이트
        const hasChanged = targetRow.originalCbm !== cbm || targetRow.originalRate !== rate
        if (hasChanged) {
          await updateRate({ id: targetRow.id, cbm, rate })
        }
      } else {
        // 새 데이터: 생성
        await createRate({ rateTypeId: selectedRateTypeId, cbm, rate })
      }
    }
  }, [selectionStart, selectedRateTypeId, tableRows, createRate, updateRate])

  // 키보드 이벤트 (Ctrl+C, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+C: 복사
      if (e.ctrlKey && e.key === "c") {
        handleCopy()
      }
      // Delete 또는 Backspace: 선택된 셀/행 삭제
      if (e.key === "Delete" || e.key === "Backspace") {
        // Input에 포커스가 있으면 기본 동작 사용
        if (document.activeElement?.tagName === "INPUT") return
        e.preventDefault()
        // 행 선택이 있으면 행 삭제, 셀 선택이 있으면 셀 삭제
        if (selectedRowIndices.size > 0) {
          handleDeleteSelectedRows()
        } else {
          handleDeleteSelectedCells()
        }
      }
      // Ctrl+A: 전체 행 선택
      if (e.ctrlKey && e.key === "a") {
        if (document.activeElement?.tagName === "INPUT") return
        e.preventDefault()
        const allIndices = new Set<number>()
        for (let i = 0; i < tableRows.length; i++) {
          allIndices.add(i)
        }
        setSelectedRowIndices(allIndices)
      }
      // Escape: 선택 해제
      if (e.key === "Escape") {
        setSelectedRowIndices(new Set())
        setSelectionStart(null)
        setSelectionEnd(null)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("paste", handleGlobalPaste)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("paste", handleGlobalPaste)
    }
  }, [handleCopy, handleGlobalPaste, handleDeleteSelectedCells, handleDeleteSelectedRows, selectedRowIndices, tableRows.length])

  // 선택 해제 (테이블 외부 클릭)
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
      setSelectionStart(null)
      setSelectionEnd(null)
      setSelectedRowIndices(new Set())
    }
  }, [])

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [handleClickOutside])

  // 엑셀 데이터 붙여넣기 처리 (Input에 포커스가 있을 때)
  // 엑셀에서 복사한 데이터는 탭으로 열 구분, 줄바꿈으로 행 구분
  const handlePaste = async (
    e: React.ClipboardEvent<HTMLInputElement>,
    startIndex: number,
    startField: "cbm" | "rate"
  ) => {
    const pastedText = e.clipboardData.getData("text")

    // 여러 줄 또는 탭이 포함된 경우에만 특별 처리
    if (!pastedText.includes("\n") && !pastedText.includes("\t")) {
      return // 일반 붙여넣기 (기본 동작)
    }

    e.preventDefault() // 기본 붙여넣기 동작 방지

    // 줄바꿈으로 행 분리
    const lines = pastedText.trim().split(/\r?\n/)
    const parsedRows: { cbm: string; rate: string }[] = []

    for (const line of lines) {
      // 탭으로만 열 분리
      const parts = line.trim().split(/\t+/)

      if (parts.length >= 2) {
        // CBM, 요금 두 열 모두 있는 경우 (쉼표 제거)
        parsedRows.push({ cbm: cleanNumber(parts[0]), rate: cleanNumber(parts[1]) })
      } else if (parts.length === 1 && parts[0].trim()) {
        // 한 열만 있는 경우: 시작 필드에 따라 결정 (쉼표 제거)
        if (startField === "cbm") {
          parsedRows.push({ cbm: cleanNumber(parts[0]), rate: "" })
        } else {
          parsedRows.push({ cbm: "", rate: cleanNumber(parts[0]) })
        }
      }
    }

    if (parsedRows.length === 0) return

    // 기존 행에 데이터 병합 (기존 행과 빈 행 모두 덮어쓰기)
    const newRows = [...tableRows]

    for (let i = 0; i < parsedRows.length; i++) {
      const targetIndex = startIndex + i

      if (targetIndex < newRows.length) {
        // 기존 행이든 빈 행이든 덮어쓰기
        newRows[targetIndex] = {
          ...newRows[targetIndex],
          cbm: parsedRows[i].cbm || newRows[targetIndex].cbm,
          rate: parsedRows[i].rate || newRows[targetIndex].rate,
        }
      } else {
        // 행이 부족하면 새 행 추가
        newRows.push({
          id: null,
          cbm: parsedRows[i].cbm,
          rate: parsedRows[i].rate,
        })
      }
    }

    // 빈 행 2개 추가 (입력 편의)
    newRows.push({ id: null, cbm: "", rate: "" })
    newRows.push({ id: null, cbm: "", rate: "" })

    setTableRows(newRows)

    // 붙여넣은 데이터 자동 저장: 기존 데이터는 update, 새 데이터는 create
    if (selectedRateTypeId) {
      for (let i = 0; i < parsedRows.length; i++) {
        const cbm = parseFloat(parsedRows[i].cbm)
        const rate = parseFloat(parsedRows[i].rate)

        if (isNaN(cbm) || cbm <= 0 || isNaN(rate) || rate < 0) continue

        const targetIndex = startIndex + i
        const targetRow = newRows[targetIndex]

        if (targetRow && targetRow.id) {
          // 기존 데이터: 변경된 경우에만 업데이트
          const hasChanged = targetRow.originalCbm !== cbm || targetRow.originalRate !== rate
          if (hasChanged) {
            await updateRate({ id: targetRow.id, cbm, rate })
          }
        } else {
          // 새 데이터: 생성
          await createRate({
            rateTypeId: selectedRateTypeId,
            cbm,
            rate,
          })
        }
      }
    }
  }

  // 행 삭제
  const handleDeleteRow = async (index: number) => {
    const row = tableRows[index]

    if (row.id) {
      // 기존 데이터: 확인 후 삭제
      if (!confirm("이 요금을 삭제하시겠습니까?")) return
      await removeRate({ id: row.id })
    } else {
      // 빈 행: 로컬에서만 제거
      const newRows = tableRows.filter((_, i) => i !== index)
      // 최소 빈 행 1개 유지
      if (newRows.filter((r) => r.id === null).length === 0) {
        newRows.push({ id: null, cbm: "", rate: "" })
      }
      setTableRows(newRows)
    }
  }

  if (companiesLoading) {
    return <div className="text-center text-gray-400 py-8">로딩 중...</div>
  }

  return (
    <div className="space-y-4">
      {/* 업체 선택 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <Label className="text-sm text-gray-500">운송 업체 선택</Label>
        <Select
          value={selectedCompanyId ?? undefined}
          onValueChange={(v) => setSelectedCompanyId(v as Id<"shippingCompanies">)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="업체를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {companies?.map((company) => (
              <SelectItem key={company._id} value={company._id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCompanyId && (
        <>
          {/* 운임 타입 관리 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">운임 타입</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingType(true)}
                disabled={isAddingType}
              >
                <Plus className="h-4 w-4 mr-1" />
                타입 추가
              </Button>
            </div>

            {isAddingType && (
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="운임 타입명 (예: 할인운임제)"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={newTypeCurrency}
                  onValueChange={(v) => setNewTypeCurrency(v as "USD" | "CNY" | "KRW")}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="CNY">CNY (¥)</SelectItem>
                    <SelectItem value="KRW">KRW (₩)</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddRateType}>
                  추가
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingType(false)
                    setNewTypeName("")
                    setNewTypeCurrency("USD")
                  }}
                >
                  취소
                </Button>
              </div>
            )}

            {rateTypesLoading ? (
              <p className="text-sm text-gray-400">로딩 중...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {rateTypes?.map((type) => (
                  <div key={type._id} className="flex items-center gap-1">
                    {editingTypeId === type._id ? (
                      // 편집 모드: 이름과 통화를 함께 수정
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                        <Input
                          value={editingTypeName}
                          onChange={(e) => setEditingTypeName(e.target.value)}
                          className="h-6 w-28 text-sm px-2 rounded"
                          autoFocus
                          placeholder="타입명"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditType()
                            if (e.key === "Escape") handleCancelEditType()
                          }}
                        />
                        {/* 통화 선택 드롭다운 */}
                        <Select
                          value={editingTypeCurrency}
                          onValueChange={(v) => setEditingTypeCurrency(v as "USD" | "CNY" | "KRW")}
                        >
                          <SelectTrigger className="h-6 w-20 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="CNY">CNY (¥)</SelectItem>
                            <SelectItem value="KRW">KRW (₩)</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          onClick={handleSaveEditType}
                          className="p-1 text-green-600 hover:bg-green-100 rounded-full"
                          title="저장"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={handleCancelEditType}
                          className="p-1 text-gray-500 hover:bg-gray-200 rounded-full"
                          title="취소"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      // 일반 모드
                      <>
                        <button
                          onClick={() => setSelectedRateTypeId(type._id)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            selectedRateTypeId === type._id
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {type.name}
                          {/* 통화 표시 */}
                          <span className="ml-1 opacity-70">
                            ({(type as { currency?: string }).currency ?? "USD"})
                          </span>
                          {type.isDefault && " (기본)"}
                        </button>
                        <button
                          onClick={() => handleStartEditType(
                            type._id,
                            type.name,
                            (type as { currency?: "USD" | "CNY" | "KRW" }).currency
                          )}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                          title="이름/통화 변경"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 운임 요금표 - 항상 편집 가능한 테이블 */}
          {selectedRateTypeId && (() => {
            // 선택된 운임 타입의 통화 가져오기
            const selectedType = rateTypes?.find((t) => t._id === selectedRateTypeId)
            const currency = (selectedType as { currency?: string })?.currency ?? "USD"
            const currencySymbol = currency === "USD" ? "$" : currency === "CNY" ? "¥" : "₩"

            return (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    요금표 <span className="text-gray-400">({currency})</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {/* 선택된 행 삭제 버튼 */}
                    {selectedRowIndices.size > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteSelectedRows}
                        className="text-red-500 hover:text-red-600 border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        선택 삭제 ({selectedRowIndices.size})
                      </Button>
                    )}
                    {/* 엑셀 템플릿 다운로드 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      템플릿
                    </Button>
                    {/* 엑셀 업로드 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      엑셀 업로드
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                    {/* 타입 삭제 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteRateType}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      타입 삭제
                    </Button>
                  </div>
                </div>

                {/* 엑셀 스타일 요금 테이블 */}
                {ratesLoading ? (
                  <p className="text-sm text-gray-400">로딩 중...</p>
                ) : (
                  <div className="space-y-2">
                    {/* 엑셀 스타일 테이블 - 드래그로 셀 선택 가능 */}
                    <div className="overflow-x-auto border border-gray-300 select-none">
                      <table ref={tableRef} className="w-full text-sm border-collapse">
                        {/* 헤더 - 엑셀 스타일 */}
                        <thead>
                          <tr>
                            <th className="bg-gray-100 border border-gray-300 py-1.5 px-2 text-center text-gray-600 font-medium w-10">
                              {/* 행 번호 열 헤더 */}
                            </th>
                            <th className="bg-gray-100 border border-gray-300 py-1.5 px-2 text-center text-gray-600 font-medium w-32">
                              CBM
                            </th>
                            <th className="bg-gray-100 border border-gray-300 py-1.5 px-2 text-center text-gray-600 font-medium">
                              요금 ({currencySymbol})
                            </th>
                            <th className="bg-gray-100 border border-gray-300 w-10">
                              {/* 삭제 버튼 열 */}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((row, index) => {
                            // 셀/행이 선택되었는지 확인
                            const isCbmSelected = selectedCells.has(`${index}-cbm`)
                            const isRateSelected = selectedCells.has(`${index}-rate`)
                            const isRowSelected = selectedRowIndices.has(index)

                            return (
                            <tr key={row.id ?? `new-${index}`} className={isRowSelected ? "bg-blue-50" : ""}>
                              {/* 행 번호 (클릭으로 행 선택) */}
                              <td
                                onClick={(e) => handleRowSelect(index, e)}
                                className={`border border-gray-300 py-0 px-2 text-center text-xs font-medium cursor-pointer select-none ${
                                  isRowSelected
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                }`}
                              >
                                {index + 1}
                              </td>
                              {/* CBM 셀 */}
                              <td
                                className={`border border-gray-300 p-0 ${isCbmSelected ? "bg-blue-100" : ""}`}
                                onMouseDown={() => handleCellMouseDown(index, "cbm")}
                                onMouseEnter={() => handleCellMouseEnter(index, "cbm")}
                              >
                                <input
                                  value={row.cbm}
                                  onChange={(e) => handleRowChange(index, "cbm", e.target.value)}
                                  onBlur={() => handleRowBlur(index)}
                                  onPaste={(e) => handlePaste(e, index, "cbm")}
                                  onKeyDown={(e) => {
                                    // Tab: 다음 셀로 이동 (기본 동작)
                                    // Enter: 다음 행의 같은 열로 이동
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      const nextRow = document.querySelector(
                                        `[data-row="${index + 1}"][data-col="cbm"]`
                                      ) as HTMLInputElement
                                      nextRow?.focus()
                                    }
                                  }}
                                  data-row={index}
                                  data-col="cbm"
                                  type="number"
                                  step="0.5"
                                  placeholder=""
                                  className={`w-full h-8 px-2 text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${isCbmSelected ? "bg-blue-100" : "bg-white focus:bg-blue-50"}`}
                                />
                              </td>
                              {/* 요금 셀 */}
                              <td
                                className={`border border-gray-300 p-0 ${isRateSelected ? "bg-blue-100" : ""}`}
                                onMouseDown={() => handleCellMouseDown(index, "rate")}
                                onMouseEnter={() => handleCellMouseEnter(index, "rate")}
                              >
                                <input
                                  value={row.rate}
                                  onChange={(e) => handleRowChange(index, "rate", e.target.value)}
                                  onBlur={() => handleRowBlur(index)}
                                  onPaste={(e) => handlePaste(e, index, "rate")}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      const nextRow = document.querySelector(
                                        `[data-row="${index + 1}"][data-col="rate"]`
                                      ) as HTMLInputElement
                                      nextRow?.focus()
                                    }
                                  }}
                                  data-row={index}
                                  data-col="rate"
                                  type="number"
                                  placeholder=""
                                  className={`w-full h-8 px-2 text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${isRateSelected ? "bg-blue-100" : "bg-white focus:bg-blue-50"}`}
                                />
                              </td>
                              {/* 삭제 버튼 */}
                              <td className="border border-gray-300 p-0 text-center">
                                {(row.id || row.cbm.trim() || row.rate.trim()) && (
                                  <button
                                    onClick={() => handleDeleteRow(index)}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                    title="삭제"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 행 추가 버튼 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddEmptyRow}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      행 추가
                    </Button>

                    <p className="text-xs text-gray-400 mt-2">
                      셀을 드래그하여 범위 선택 → Ctrl+C 복사, Ctrl+V 붙여넣기. 엑셀 데이터도 붙여넣기 가능. 자동 저장됩니다.
                    </p>
                  </div>
                )}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
