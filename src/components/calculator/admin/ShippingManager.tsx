"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Plus, Trash2, Pencil, Check, X, Upload, Download,
  ChevronUp, ChevronDown, DollarSign, Edit2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import ExcelJS from "exceljs"
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
  useCompanyWarehouses,
  useCompanyCosts,
} from "@/hooks"
import { Id } from "../../../../convex/_generated/dataModel"
import { ChinaAddressSelector } from "../common/ChinaAddressSelector"
import { CompanyCostModal } from "./CompanyCostModal"

// ===== 테이블 관련 타입 (ShippingRateManager에서 이동) =====

// 테이블 행 타입: id가 null이면 새 행, 아니면 기존 데이터
interface TableRow {
  id: Id<"internationalShippingRates"> | null
  cbm: string
  rate: string
  originalCbm?: number
  originalRate?: number
}

// 셀 위치 타입
interface CellPosition {
  row: number
  col: "cbm" | "rate"
}

// 숫자 문자열에서 쉼표 제거
function cleanNumber(value: string): string {
  return value.replace(/,/g, "").replace(/[^\d.]/g, "")
}

// 선택 범위 계산
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

// ===== 메인 통합 컴포넌트 =====
// 📌 비유: Excel 리본 메뉴처럼 상단에 설정(업체/창고/운임타입),
//    하단에 요금표 시트를 배치하는 방식
export function ShippingManager() {
  // ===== 데이터 훅 =====
  const { companies, isLoading: companiesLoading, createCompany, updateCompany, removeCompany } = useShippingCompanies()
  const [selectedCompanyId, setSelectedCompanyId] = useState<Id<"shippingCompanies"> | null>(null)

  const { warehouses, isLoading: warehousesLoading, createWarehouse, removeWarehouse } = useCompanyWarehouses(selectedCompanyId)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<Id<"companyWarehouses"> | null>(null)

  const {
    rateTypes, isLoading: rateTypesLoading,
    createRateType, updateRateType, removeRateType,
  } = useShippingRateTypes(selectedWarehouseId)
  const [selectedRateTypeId, setSelectedRateTypeId] = useState<Id<"shippingRateTypes"> | null>(null)

  const {
    rates, isLoading: ratesLoading,
    createRate, updateRate, removeRate, removeAllRates,
  } = useShippingRates(selectedRateTypeId)

  // 공통 비용 (모달에서 사용)
  const { items: costItems } = useCompanyCosts(selectedCompanyId)

  // ===== UI 상태 =====
  // 컨트롤 패널 접기/펼치기
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(true)

  // 공통 비용 모달
  const [isCostModalOpen, setIsCostModalOpen] = useState(false)

  // 업체 추가/편집
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyDesc, setNewCompanyDesc] = useState("")
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [editCompanyName, setEditCompanyName] = useState("")
  const [editCompanyDesc, setEditCompanyDesc] = useState("")

  // 창고 추가
  const [isAddingWarehouse, setIsAddingWarehouse] = useState(false)
  const [newWarehouseName, setNewWarehouseName] = useState("")
  const [newProvinceCode, setNewProvinceCode] = useState<string | null>(null)
  const [newCityCode, setNewCityCode] = useState<string | null>(null)

  // 운임 타입 추가/편집
  const [isAddingType, setIsAddingType] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [newTypeCurrency, setNewTypeCurrency] = useState<"USD" | "CNY" | "KRW">("USD")
  const [newTypeUnitType, setNewTypeUnitType] = useState<"cbm" | "kg">("cbm")
  const [editingTypeId, setEditingTypeId] = useState<Id<"shippingRateTypes"> | null>(null)
  const [editingTypeName, setEditingTypeName] = useState("")
  const [editingTypeCurrency, setEditingTypeCurrency] = useState<"USD" | "CNY" | "KRW">("USD")

  // ===== 요금 테이블 상태 (ShippingRateManager에서 이동) =====
  const [tableRows, setTableRows] = useState<TableRow[]>([])
  const [selectionStart, setSelectionStart] = useState<CellPosition | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<CellPosition | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const tableRef = useRef<HTMLTableElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set())
  const [lastSelectedRowIndex, setLastSelectedRowIndex] = useState<number | null>(null)

  const selectedCells = selectionStart && selectionEnd
    ? getSelectedRange(selectionStart, selectionEnd)
    : new Set<string>()

  // ===== 자동 선택 로직 =====
  // 첫 번째 업체 자동 선택
  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0]._id)
    }
  }, [companies, selectedCompanyId])

  // 첫 번째 창고 자동 선택
  useEffect(() => {
    if (warehouses && warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0]._id)
    }
  }, [warehouses, selectedWarehouseId])

  // 첫 번째 운임 타입 자동 선택
  useEffect(() => {
    if (rateTypes && rateTypes.length > 0 && !selectedRateTypeId) {
      setSelectedRateTypeId(rateTypes[0]._id)
    }
  }, [rateTypes, selectedRateTypeId])

  // 업체 변경 시 하위 초기화
  useEffect(() => {
    setSelectedWarehouseId(null)
    setSelectedRateTypeId(null)
  }, [selectedCompanyId])

  // 창고 변경 시 운임 타입 초기화
  useEffect(() => {
    setSelectedRateTypeId(null)
  }, [selectedWarehouseId])

  // rates 데이터 → tableRows 동기화
  useEffect(() => {
    if (rates === undefined) return
    const existingRows: TableRow[] = rates.map((rate) => {
      const rateValue = (rate as { rate?: number; rateUSD?: number }).rate
        ?? (rate as { rate?: number; rateUSD?: number }).rateUSD ?? 0
      return {
        id: rate._id,
        cbm: rate.cbm.toString(),
        rate: rateValue.toString(),
        originalCbm: rate.cbm,
        originalRate: rateValue,
      }
    })
    setTableRows([...existingRows, { id: null, cbm: "", rate: "" }, { id: null, cbm: "", rate: "" }])
  }, [rates])

  // ===== 업체 CRUD =====
  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return
    await createCompany({
      name: newCompanyName.trim(),
      description: newCompanyDesc.trim() || undefined,
    })
    setNewCompanyName("")
    setNewCompanyDesc("")
    setIsAddingCompany(false)
  }

  const handleStartEditCompany = () => {
    const company = companies?.find((c) => c._id === selectedCompanyId)
    if (!company) return
    setEditCompanyName(company.name)
    setEditCompanyDesc(company.description ?? "")
    setIsEditingCompany(true)
  }

  const handleSaveEditCompany = async () => {
    if (!selectedCompanyId || !editCompanyName.trim()) return
    await updateCompany({
      id: selectedCompanyId,
      name: editCompanyName.trim(),
      description: editCompanyDesc.trim() || undefined,
    })
    setIsEditingCompany(false)
  }

  const handleDeleteCompany = async () => {
    if (!selectedCompanyId) return
    if (!confirm("이 업체와 관련된 모든 데이터가 삭제됩니다. 계속하시겠습니까?")) return
    await removeCompany({ id: selectedCompanyId })
    setSelectedCompanyId(null)
  }

  // ===== 창고 CRUD =====
  const handleAddWarehouse = async () => {
    if (!selectedCompanyId || !newWarehouseName.trim() || !newProvinceCode || !newCityCode) return
    await createWarehouse({
      companyId: selectedCompanyId,
      name: newWarehouseName.trim(),
      provinceCode: newProvinceCode,
      cityCode: newCityCode,
      sortOrder: (warehouses?.length ?? 0) + 1,
    })
    setNewWarehouseName("")
    setNewProvinceCode(null)
    setNewCityCode(null)
    setIsAddingWarehouse(false)
  }

  const handleDeleteWarehouse = async () => {
    if (!selectedWarehouseId) return
    if (!confirm("이 창고와 관련된 운임 데이터가 삭제됩니다. 계속하시겠습니까?")) return
    await removeWarehouse({ id: selectedWarehouseId })
    setSelectedWarehouseId(null)
  }

  // ===== 운임 타입 CRUD =====
  const handleAddRateType = async () => {
    if (!selectedWarehouseId || !newTypeName.trim()) return
    await createRateType({
      warehouseId: selectedWarehouseId,
      name: newTypeName.trim(),
      currency: newTypeCurrency,
      unitType: newTypeUnitType,
      isDefault: false,
      sortOrder: (rateTypes?.length ?? 0) + 1,
    })
    setNewTypeName("")
    setNewTypeCurrency("USD")
    setNewTypeUnitType("cbm")
    setIsAddingType(false)
  }

  const handleDeleteRateType = async () => {
    if (!selectedRateTypeId) return
    if (!confirm("이 운임 타입과 관련 요금표를 삭제하시겠습니까?")) return
    await removeAllRates({ rateTypeId: selectedRateTypeId })
    await removeRateType({ id: selectedRateTypeId })
    setSelectedRateTypeId(null)
  }

  const handleStartEditType = (
    typeId: Id<"shippingRateTypes">,
    currentName: string,
    currentCurrency?: "USD" | "CNY" | "KRW"
  ) => {
    setEditingTypeId(typeId)
    setEditingTypeName(currentName)
    setEditingTypeCurrency(currentCurrency ?? "USD")
  }

  const handleSaveEditType = async () => {
    if (!editingTypeId || !editingTypeName.trim()) return
    await updateRateType({
      id: editingTypeId,
      name: editingTypeName.trim(),
      currency: editingTypeCurrency,
    })
    setEditingTypeId(null)
  }

  // ===== 요금 테이블 핸들러 (ShippingRateManager에서 이동) =====
  const handleRowChange = (index: number, field: "cbm" | "rate", value: string) => {
    const newRows = [...tableRows]
    newRows[index] = { ...newRows[index], [field]: value }
    setTableRows(newRows)
  }

  const handleRowBlur = useCallback(async (index: number) => {
    if (!selectedRateTypeId) return
    const row = tableRows[index]
    const cbm = parseFloat(row.cbm)
    const rate = parseFloat(row.rate)
    if (!row.cbm.trim() && !row.rate.trim()) return
    if (isNaN(cbm) || cbm <= 0 || isNaN(rate) || rate < 0) return

    if (row.id) {
      const hasChanged = row.originalCbm !== cbm || row.originalRate !== rate
      if (hasChanged) await updateRate({ id: row.id, cbm, rate })
    } else {
      if (row.cbm.trim() && row.rate.trim()) {
        await createRate({ rateTypeId: selectedRateTypeId, cbm, rate })
      }
    }
  }, [tableRows, selectedRateTypeId, updateRate, createRate])

  const handleAddEmptyRow = () => {
    setTableRows([...tableRows, { id: null, cbm: "", rate: "" }])
  }

  // 셀 선택
  const handleCellMouseDown = (row: number, col: "cbm" | "rate") => {
    setSelectionStart({ row, col })
    setSelectionEnd({ row, col })
    setIsDragging(true)
  }
  const handleCellMouseEnter = (row: number, col: "cbm" | "rate") => {
    if (isDragging) setSelectionEnd({ row, col })
  }
  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [handleMouseUp])

  // 복사
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
      for (let c = minCol; c <= maxCol; c++) values.push(row[cols[c]])
      lines.push(values.join("\t"))
    }
    navigator.clipboard.writeText(lines.join("\n"))
  }, [selectedCells, selectionStart, selectionEnd, tableRows])

  // 셀 삭제
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
      for (let c = minCol; c <= maxCol; c++) newRows[r] = { ...newRows[r], [cols[c]]: "" }
      if (!newRows[r].cbm.trim() && !newRows[r].rate.trim() && row.id) rowsToDelete.push(row.id)
    }

    const filteredRows = newRows.filter((row) => !(row.id && !row.cbm.trim() && !row.rate.trim()))
    if (filteredRows.every((r) => r.id !== null)) filteredRows.push({ id: null, cbm: "", rate: "" })

    setTableRows(filteredRows)
    for (const id of rowsToDelete) await removeRate({ id })
    setSelectionStart(null)
    setSelectionEnd(null)
  }, [selectedCells, selectionStart, selectionEnd, tableRows, removeRate])

  // 행 선택
  const handleRowSelect = useCallback((rowIndex: number, e: React.MouseEvent) => {
    setSelectionStart(null)
    setSelectionEnd(null)
    if (e.shiftKey && lastSelectedRowIndex !== null) {
      const start = Math.min(lastSelectedRowIndex, rowIndex)
      const end = Math.max(lastSelectedRowIndex, rowIndex)
      const newSelection = new Set<number>()
      for (let i = start; i <= end; i++) newSelection.add(i)
      setSelectedRowIndices(newSelection)
    } else if (e.ctrlKey || e.metaKey) {
      const newSelection = new Set(selectedRowIndices)
      if (newSelection.has(rowIndex)) newSelection.delete(rowIndex)
      else newSelection.add(rowIndex)
      setSelectedRowIndices(newSelection)
      setLastSelectedRowIndex(rowIndex)
    } else {
      setSelectedRowIndices(new Set([rowIndex]))
      setLastSelectedRowIndex(rowIndex)
    }
  }, [lastSelectedRowIndex, selectedRowIndices])

  // 선택된 행 삭제
  const handleDeleteSelectedRows = useCallback(async () => {
    if (selectedRowIndices.size === 0) return
    const rowsToDelete: Id<"internationalShippingRates">[] = []
    for (const idx of Array.from(selectedRowIndices).sort((a, b) => b - a)) {
      const row = tableRows[idx]
      if (row?.id) rowsToDelete.push(row.id)
    }
    const newRows = tableRows.filter((_, idx) => !selectedRowIndices.has(idx))
    if (newRows.every((r) => r.id !== null)) newRows.push({ id: null, cbm: "", rate: "" })
    setTableRows(newRows)
    setSelectedRowIndices(new Set())
    setLastSelectedRowIndex(null)
    for (const id of rowsToDelete) await removeRate({ id })
  }, [selectedRowIndices, tableRows, removeRate])

  // 엑셀 템플릿 다운로드
  const handleDownloadTemplate = useCallback(async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("운임요금")
    ws.columns = [
      { header: "CBM", key: "cbm", width: 10 },
      { header: "요금", key: "rate", width: 15 },
    ]
    ws.addRows([
      { cbm: 0.5, rate: 85 },
      { cbm: 1, rate: 110 },
      { cbm: 1.5, rate: 130 },
      { cbm: 2, rate: 150 },
    ])
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "운임요금_템플릿.xlsx"
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // 엑셀 업로드
  const handleExcelUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedRateTypeId) return
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(arrayBuffer)
      const worksheet = workbook.worksheets[0]
      if (!worksheet) { alert("워크시트를 찾을 수 없습니다."); return }

      const headerRow = worksheet.getRow(1)
      let cbmColIndex = -1
      let rateColIndex = -1
      headerRow.eachCell((cell, colNumber) => {
        const value = String(cell.value ?? "").trim().toLowerCase()
        if (value === "cbm") cbmColIndex = colNumber
        if (value === "요금" || value === "rate") rateColIndex = colNumber
      })
      if (cbmColIndex === -1) cbmColIndex = 1
      if (rateColIndex === -1) rateColIndex = 2

      const parsedData: { cbm: number; rate: number }[] = []
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const cbm = Number(row.getCell(cbmColIndex).value)
        const rate = Number(row.getCell(rateColIndex).value)
        if (!isNaN(cbm) && !isNaN(rate) && cbm > 0 && rate >= 0) parsedData.push({ cbm, rate })
      })

      const newRows: TableRow[] = [...tableRows.filter((r) => r.id !== null)]
      for (const row of parsedData) newRows.push({ id: null, cbm: String(row.cbm), rate: String(row.rate) })
      newRows.push({ id: null, cbm: "", rate: "" }, { id: null, cbm: "", rate: "" })
      setTableRows(newRows)

      for (const row of parsedData) {
        await createRate({ rateTypeId: selectedRateTypeId, cbm: row.cbm, rate: row.rate })
      }
      alert(`${parsedData.length}개의 요금이 업로드되었습니다.`)
    } catch (error) {
      console.error("엑셀 파싱 오류:", error)
      alert("엑셀 파일을 읽는 중 오류가 발생했습니다.")
    }
    e.target.value = ""
  }, [selectedRateTypeId, tableRows, createRate])

  // 전역 붙여넣기 (셀 선택 상태)
  const handleGlobalPaste = useCallback(async (e: ClipboardEvent) => {
    if (document.activeElement?.tagName === "INPUT") return
    if (!selectionStart || !selectedRateTypeId) return
    const pastedText = e.clipboardData?.getData("text")
    if (!pastedText) return
    e.preventDefault()

    const lines = pastedText.trim().split(/\r?\n/)
    const parsedRows: { cbm: string; rate: string }[] = []
    for (const line of lines) {
      const parts = line.trim().split(/\t+/)
      if (parts.length >= 2) parsedRows.push({ cbm: cleanNumber(parts[0]), rate: cleanNumber(parts[1]) })
      else if (parts.length === 1 && parts[0].trim()) {
        if (selectionStart.col === "cbm") parsedRows.push({ cbm: cleanNumber(parts[0]), rate: "" })
        else parsedRows.push({ cbm: "", rate: cleanNumber(parts[0]) })
      }
    }
    if (parsedRows.length === 0) return

    const newRows = [...tableRows]
    const startRow = selectionStart.row
    for (let i = 0; i < parsedRows.length; i++) {
      const targetIndex = startRow + i
      if (targetIndex < newRows.length) {
        newRows[targetIndex] = {
          ...newRows[targetIndex],
          cbm: parsedRows[i].cbm || newRows[targetIndex].cbm,
          rate: parsedRows[i].rate || newRows[targetIndex].rate,
        }
      } else {
        newRows.push({ id: null, cbm: parsedRows[i].cbm, rate: parsedRows[i].rate })
      }
    }
    newRows.push({ id: null, cbm: "", rate: "" }, { id: null, cbm: "", rate: "" })
    setTableRows(newRows)

    for (let i = 0; i < parsedRows.length; i++) {
      const cbm = parseFloat(parsedRows[i].cbm)
      const rate = parseFloat(parsedRows[i].rate)
      if (isNaN(cbm) || cbm <= 0 || isNaN(rate) || rate < 0) continue
      const targetRow = newRows[startRow + i]
      if (targetRow?.id) {
        const hasChanged = targetRow.originalCbm !== cbm || targetRow.originalRate !== rate
        if (hasChanged) await updateRate({ id: targetRow.id, cbm, rate })
      } else {
        await createRate({ rateTypeId: selectedRateTypeId, cbm, rate })
      }
    }
  }, [selectionStart, selectedRateTypeId, tableRows, createRate, updateRate])

  // Input 붙여넣기 (여러 줄/탭 포함)
  const handlePaste = async (
    e: React.ClipboardEvent<HTMLInputElement>,
    startIndex: number,
    startField: "cbm" | "rate"
  ) => {
    const pastedText = e.clipboardData.getData("text")
    if (!pastedText.includes("\n") && !pastedText.includes("\t")) return
    e.preventDefault()

    const lines = pastedText.trim().split(/\r?\n/)
    const parsedRows: { cbm: string; rate: string }[] = []
    for (const line of lines) {
      const parts = line.trim().split(/\t+/)
      if (parts.length >= 2) parsedRows.push({ cbm: cleanNumber(parts[0]), rate: cleanNumber(parts[1]) })
      else if (parts.length === 1 && parts[0].trim()) {
        if (startField === "cbm") parsedRows.push({ cbm: cleanNumber(parts[0]), rate: "" })
        else parsedRows.push({ cbm: "", rate: cleanNumber(parts[0]) })
      }
    }
    if (parsedRows.length === 0) return

    const newRows = [...tableRows]
    for (let i = 0; i < parsedRows.length; i++) {
      const targetIndex = startIndex + i
      if (targetIndex < newRows.length) {
        newRows[targetIndex] = {
          ...newRows[targetIndex],
          cbm: parsedRows[i].cbm || newRows[targetIndex].cbm,
          rate: parsedRows[i].rate || newRows[targetIndex].rate,
        }
      } else {
        newRows.push({ id: null, cbm: parsedRows[i].cbm, rate: parsedRows[i].rate })
      }
    }
    newRows.push({ id: null, cbm: "", rate: "" }, { id: null, cbm: "", rate: "" })
    setTableRows(newRows)

    if (selectedRateTypeId) {
      for (let i = 0; i < parsedRows.length; i++) {
        const cbm = parseFloat(parsedRows[i].cbm)
        const rate = parseFloat(parsedRows[i].rate)
        if (isNaN(cbm) || cbm <= 0 || isNaN(rate) || rate < 0) continue
        const targetRow = newRows[startIndex + i]
        if (targetRow?.id) {
          const hasChanged = targetRow.originalCbm !== cbm || targetRow.originalRate !== rate
          if (hasChanged) await updateRate({ id: targetRow.id, cbm, rate })
        } else {
          await createRate({ rateTypeId: selectedRateTypeId, cbm, rate })
        }
      }
    }
  }

  // 행 삭제
  const handleDeleteRow = async (index: number) => {
    const row = tableRows[index]
    if (row.id) {
      if (!confirm("이 요금을 삭제하시겠습니까?")) return
      await removeRate({ id: row.id })
    } else {
      const newRows = tableRows.filter((_, i) => i !== index)
      if (newRows.filter((r) => r.id === null).length === 0) newRows.push({ id: null, cbm: "", rate: "" })
      setTableRows(newRows)
    }
  }

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "c") handleCopy()
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedRowIndices.size > 0) { e.preventDefault(); handleDeleteSelectedRows(); return }
        if (selectedCells.size > 1) { e.preventDefault(); handleDeleteSelectedCells(); return }
        if (document.activeElement?.tagName === "INPUT") return
        e.preventDefault(); handleDeleteSelectedCells()
      }
      if (e.ctrlKey && e.key === "a") {
        if (document.activeElement?.tagName === "INPUT") return
        e.preventDefault()
        const allIndices = new Set<number>()
        for (let i = 0; i < tableRows.length; i++) allIndices.add(i)
        setSelectedRowIndices(allIndices)
      }
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
  }, [handleCopy, handleGlobalPaste, handleDeleteSelectedCells, handleDeleteSelectedRows, selectedRowIndices, tableRows.length, selectedCells.size])

  // 테이블 외부 클릭 시 선택 해제
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

  // ===== 파생 데이터 =====
  const selectedCompany = companies?.find((c) => c._id === selectedCompanyId)
  const selectedType = rateTypes?.find((t) => t._id === selectedRateTypeId)
  const currency = selectedType?.currency ?? "USD"
  const currencySymbol = currency === "USD" ? "$" : currency === "CNY" ? "¥" : "₩"
  const unitType = selectedType?.unitType ?? "cbm"
  const unitLabel = unitType === "kg" ? "KG" : "CBM"

  if (companiesLoading) {
    return <div className="text-center text-gray-400 py-8">로딩 중...</div>
  }

  return (
    <div className="space-y-3">
      {/* ===== 컨트롤 패널 ===== */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        {/* 패널 헤더: 접기/펼치기 */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">운송 관리</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}
            className="h-7 px-2"
          >
            {isControlPanelOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isControlPanelOpen && (
          <div className="space-y-3">
            {/* 1행: 업체 + 창고 + 공통비용 */}
            <div className="flex items-end gap-3 flex-wrap">
              {/* 업체 드롭다운 */}
              <div className="min-w-0">
                <Label className="text-xs text-gray-500">업체</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Select
                    value={selectedCompanyId ?? undefined}
                    onValueChange={(v) => setSelectedCompanyId(v as Id<"shippingCompanies">)}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="업체 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company._id} value={company._id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setIsAddingCompany(true)}
                    className="h-8 px-2" title="업체 추가"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  {selectedCompanyId && (
                    <>
                      <Button
                        variant="ghost" size="sm"
                        onClick={handleStartEditCompany}
                        className="h-8 px-2" title="업체 편집"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={handleDeleteCompany}
                        className="h-8 px-2 text-red-400 hover:text-red-600" title="업체 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* 구분선 */}
              <div className="w-px h-8 bg-gray-200 self-end" />

              {/* 창고 드롭다운 */}
              <div className="min-w-0">
                <Label className="text-xs text-gray-500">창고 (배송지)</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Select
                    value={selectedWarehouseId ?? undefined}
                    onValueChange={(v) => setSelectedWarehouseId(v as Id<"companyWarehouses">)}
                    disabled={warehousesLoading || !warehouses?.length}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder={warehouses?.length ? "창고 선택" : "창고 없음"} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((wh) => (
                        <SelectItem key={wh._id} value={wh._id}>
                          {wh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCompanyId && (
                    <>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setIsAddingWarehouse(true)}
                        className="h-8 px-2" title="창고 추가"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      {selectedWarehouseId && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={handleDeleteWarehouse}
                          className="h-8 px-2 text-red-400 hover:text-red-600" title="창고 삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 구분선 */}
              <div className="w-px h-8 bg-gray-200 self-end" />

              {/* 공통 비용 버튼 */}
              {selectedCompanyId && (
                <Button
                  variant="outline" size="sm"
                  onClick={() => setIsCostModalOpen(true)}
                  className="h-8 self-end"
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                  공통 비용 ({costItems?.length ?? 0})
                </Button>
              )}
            </div>

            {/* 업체 추가 폼 */}
            {isAddingCompany && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Input
                  placeholder="업체명"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="h-7 text-sm flex-1"
                  autoFocus
                />
                <Input
                  placeholder="설명 (선택)"
                  value={newCompanyDesc}
                  onChange={(e) => setNewCompanyDesc(e.target.value)}
                  className="h-7 text-sm flex-1"
                />
                <Button size="sm" variant="ghost" onClick={handleAddCompany} className="h-7 px-2">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsAddingCompany(false); setNewCompanyName(""); setNewCompanyDesc("") }} className="h-7 px-2">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* 업체 편집 폼 */}
            {isEditingCompany && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <Input
                  placeholder="업체명"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  className="h-7 text-sm flex-1"
                  autoFocus
                />
                <Input
                  placeholder="설명 (선택)"
                  value={editCompanyDesc}
                  onChange={(e) => setEditCompanyDesc(e.target.value)}
                  className="h-7 text-sm flex-1"
                />
                <Button size="sm" variant="ghost" onClick={handleSaveEditCompany} className="h-7 px-2">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingCompany(false)} className="h-7 px-2">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* 창고 추가 폼 */}
            {isAddingWarehouse && (
              <div className="p-2 bg-gray-50 rounded-lg space-y-2">
                <Input
                  placeholder="창고명 (예: 위해 LCL)"
                  value={newWarehouseName}
                  onChange={(e) => setNewWarehouseName(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                />
                <ChinaAddressSelector
                  provinceCode={newProvinceCode}
                  cityCode={newCityCode}
                  onProvinceChange={(code) => { setNewProvinceCode(code); setNewCityCode(null) }}
                  onCityChange={setNewCityCode}
                  size="sm"
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={handleAddWarehouse}
                    disabled={!newWarehouseName.trim() || !newProvinceCode || !newCityCode}
                    className="h-7 px-2 text-xs"
                  >
                    <Check className="h-3 w-3 text-green-600 mr-1" /> 추가
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => { setIsAddingWarehouse(false); setNewWarehouseName(""); setNewProvinceCode(null); setNewCityCode(null) }}
                    className="h-7 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" /> 취소
                  </Button>
                </div>
              </div>
            )}

            {/* 2행: 운임 타입 pill 버튼 */}
            {selectedWarehouseId && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-gray-500">운임 타입</Label>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setIsAddingType(true)}
                    disabled={isAddingType}
                    className="h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> 타입 추가
                  </Button>
                </div>

                {/* 타입 추가 폼 */}
                {isAddingType && (
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="운임 타입명"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      className="flex-1 h-7 text-sm"
                      autoFocus
                    />
                    <Select value={newTypeCurrency} onValueChange={(v) => setNewTypeCurrency(v as "USD" | "CNY" | "KRW")}>
                      <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="CNY">CNY</SelectItem>
                        <SelectItem value="KRW">KRW</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={newTypeUnitType} onValueChange={(v) => setNewTypeUnitType(v as "cbm" | "kg")}>
                      <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cbm">CBM</SelectItem>
                        <SelectItem value="kg">KG</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleAddRateType} className="h-7 px-2 text-xs">추가</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setIsAddingType(false); setNewTypeName("") }} className="h-7 px-2 text-xs">취소</Button>
                  </div>
                )}

                {/* pill 버튼 목록 */}
                {rateTypesLoading ? (
                  <p className="text-xs text-gray-400">로딩 중...</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {rateTypes?.map((type) => (
                      <div key={type._id} className="flex items-center gap-0.5">
                        {editingTypeId === type._id ? (
                          <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                            <Input
                              value={editingTypeName}
                              onChange={(e) => setEditingTypeName(e.target.value)}
                              className="h-6 w-28 text-sm px-2 rounded"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEditType()
                                if (e.key === "Escape") setEditingTypeId(null)
                              }}
                            />
                            <Select value={editingTypeCurrency} onValueChange={(v) => setEditingTypeCurrency(v as "USD" | "CNY" | "KRW")}>
                              <SelectTrigger className="h-6 w-20 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="CNY">CNY</SelectItem>
                                <SelectItem value="KRW">KRW</SelectItem>
                              </SelectContent>
                            </Select>
                            <button onClick={handleSaveEditType} className="p-1 text-green-600 hover:bg-green-100 rounded-full">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setEditingTypeId(null)} className="p-1 text-gray-500 hover:bg-gray-200 rounded-full">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedRateTypeId(type._id)}
                              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                                selectedRateTypeId === type._id
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {type.name}
                              <span className="ml-1 opacity-70">({type.currency ?? "USD"})</span>
                              <span className={`ml-1 text-[10px] px-1 py-0.5 rounded ${
                                type.unitType === "kg"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}>
                                {type.unitType === "kg" ? "KG" : "CBM"}
                              </span>
                            </button>
                            <button
                              onClick={() => handleStartEditType(type._id, type.name, type.currency)}
                              className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== 메인 영역: 요금 테이블 ===== */}
      {selectedRateTypeId && (
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          {/* 테이블 헤더 */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">
              요금표 <span className="text-gray-400">({currency})</span>
            </h3>
            <div className="flex items-center gap-2">
              {selectedRowIndices.size > 0 && (
                <Button variant="outline" size="sm" onClick={handleDeleteSelectedRows}
                  className="text-red-500 hover:text-red-600 border-red-300 h-7 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  선택 삭제 ({selectedRowIndices.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-7 text-xs">
                <Download className="h-3.5 w-3.5 mr-1" /> 템플릿
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 text-xs">
                <Upload className="h-3.5 w-3.5 mr-1" /> 엑셀 업로드
              </Button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
              <Button variant="ghost" size="sm" onClick={handleDeleteRateType}
                className="text-red-500 hover:text-red-600 h-7 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> 타입 삭제
              </Button>
            </div>
          </div>

          {/* Excel 스타일 테이블 */}
          {ratesLoading ? (
            <p className="text-sm text-gray-400">로딩 중...</p>
          ) : (
            <div className="space-y-2">
              <div className="overflow-x-auto border border-gray-300 select-none">
                <table ref={tableRef} className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="bg-gray-100 border border-gray-300 py-1 px-2 text-center text-gray-600 font-medium w-10" />
                      <th className="bg-gray-100 border border-gray-300 py-1 px-2 text-center text-gray-600 font-medium w-32">
                        {unitLabel}
                      </th>
                      <th className="bg-gray-100 border border-gray-300 py-1 px-2 text-center text-gray-600 font-medium">
                        요금 ({currencySymbol})
                      </th>
                      <th className="bg-gray-100 border border-gray-300 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, index) => {
                      const isCbmSelected = selectedCells.has(`${index}-cbm`)
                      const isRateSelected = selectedCells.has(`${index}-rate`)
                      const isRowSelected = selectedRowIndices.has(index)

                      return (
                        <tr key={row.id ?? `new-${index}`} className={isRowSelected ? "bg-blue-50" : ""}>
                          <td
                            onClick={(e) => handleRowSelect(index, e)}
                            className={`border border-gray-300 py-0 px-2 text-center text-xs font-medium cursor-pointer select-none ${
                              isRowSelected ? "bg-blue-500 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            {index + 1}
                          </td>
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
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  const nextRow = document.querySelector(`[data-row="${index + 1}"][data-col="cbm"]`) as HTMLInputElement
                                  nextRow?.focus()
                                }
                              }}
                              data-row={index} data-col="cbm"
                              type="number" step="0.5"
                              className={`w-full h-8 px-2 text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${isCbmSelected ? "bg-blue-100" : "bg-white focus:bg-blue-50"}`}
                            />
                          </td>
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
                                  const nextRow = document.querySelector(`[data-row="${index + 1}"][data-col="rate"]`) as HTMLInputElement
                                  nextRow?.focus()
                                }
                              }}
                              data-row={index} data-col="rate"
                              type="number"
                              className={`w-full h-8 px-2 text-sm border-0 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${isRateSelected ? "bg-blue-100" : "bg-white focus:bg-blue-50"}`}
                            />
                          </td>
                          <td className="border border-gray-300 p-0 text-center">
                            {(row.id || row.cbm.trim() || row.rate.trim()) && (
                              <button onClick={() => handleDeleteRow(index)} className="p-1 text-gray-400 hover:text-red-500" title="삭제">
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

              <Button variant="outline" size="sm" onClick={handleAddEmptyRow} className="w-full h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> 행 추가
              </Button>

              <p className="text-xs text-gray-400">
                셀 드래그로 범위 선택 → Ctrl+C 복사, Ctrl+V 붙여넣기. 엑셀 데이터도 붙여넣기 가능. 자동 저장.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 운임 타입/창고 미선택 안내 */}
      {!selectedRateTypeId && selectedWarehouseId && !rateTypesLoading && (
        <div className="text-center text-gray-400 py-8 text-sm">
          운임 타입을 선택하거나 추가해주세요
        </div>
      )}
      {!selectedWarehouseId && selectedCompanyId && !warehousesLoading && (
        <div className="text-center text-gray-400 py-8 text-sm">
          창고를 선택하거나 추가해주세요
        </div>
      )}

      {/* ===== 공통 비용 모달 ===== */}
      <CompanyCostModal
        open={isCostModalOpen}
        onOpenChange={setIsCostModalOpen}
        companyId={selectedCompanyId}
        companyName={selectedCompany?.name}
      />
    </div>
  )
}
