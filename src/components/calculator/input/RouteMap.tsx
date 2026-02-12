"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
  MapControl,
  ControlPosition,
} from "@vis.gl/react-google-maps"
import { Search, X } from "lucide-react"

// ===== 타입 정의 =====

// 좌표 + 라벨 타입
interface MapPoint {
  lat: number
  lng: number
  label: string
}

// 검색 결과 타입
interface SearchPlace {
  lat: number
  lng: number
  name: string
  address: string
}

// 항구 마커 타입 (FCL 모드용)
interface PortMarker {
  id: string
  lat: number
  lng: number
  label: string
  isSelected: boolean
}

interface RouteMapProps {
  departure: MapPoint | null
  destination: MapPoint | null
  // 실제 도로 거리(km) 콜백 (Directions API 결과)
  onDistanceChange?: (distanceKm: number | null) => void
  // FCL 모드: 항구 마커 목록
  ports?: PortMarker[]
  onPortClick?: (portId: string) => void
}

// Google Maps API 키
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

// ===== 지도 내부 장소 검색 컴포넌트 =====
// 📌 비유: 네이버 지도 앱의 상단 검색창처럼, 지도 위에 검색창을 띄워서
//    한국어/영어/중국어로 장소를 검색할 수 있게 합니다.
//    Google Places Autocomplete API가 자동완성 목록을 보여주고,
//    선택하면 지도가 해당 위치로 이동합니다.
function MapSearchBox({
  onPlaceSelect,
}: {
  onPlaceSelect: (place: SearchPlace | null) => void
}) {
  const map = useMap()
  // Places 라이브러리 로드 (useMapsLibrary는 APIProvider 내부에서만 동작)
  const placesLib = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  // Autocomplete 인스턴스를 ref로 관리 (재생성 방지)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  // 검색어가 있는지 추적 (X 버튼 표시용)
  const [hasInput, setHasInput] = useState(false)

  useEffect(() => {
    // Places 라이브러리가 로드되지 않았거나, input이 없거나, 이미 초기화된 경우 스킵
    if (!placesLib || !inputRef.current || autocompleteRef.current) return

    // Google Places Autocomplete 초기화
    // componentRestrictions: { country: "cn" } → 중국 지역만 검색되도록 제한
    // fields: 필요한 데이터만 요청 (비용 절감)
    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "cn" },
      fields: ["geometry", "name", "formatted_address"],
    })

    // 사용자가 자동완성 목록에서 장소를 선택했을 때 실행
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace()

      if (place.geometry?.location) {
        const loc = place.geometry.location

        // 지도를 선택한 장소로 이동 + 적절한 줌 레벨로 확대
        map?.panTo(loc)
        map?.setZoom(13)

        // 부모 컴포넌트에 선택된 장소 정보 전달
        onPlaceSelect({
          lat: loc.lat(),
          lng: loc.lng(),
          name: place.name || "",
          address: place.formatted_address || "",
        })
      }
    })

    autocompleteRef.current = autocomplete

    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      google.maps.event.clearInstanceListeners(autocomplete)
      autocompleteRef.current = null
    }
  }, [placesLib, map, onPlaceSelect])

  // 검색 내용 지우기 (X 버튼)
  const handleClear = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = ""
      inputRef.current.focus()
    }
    setHasInput(false)
    onPlaceSelect(null)
  }, [onPlaceSelect])

  // 입력 변화 추적 (X 버튼 표시/숨김)
  const handleInputChange = useCallback(() => {
    setHasInput(!!inputRef.current?.value)
  }, [])

  return (
    // MapControl: 지도의 특정 위치에 커스텀 UI를 배치하는 공식 컴포넌트
    // TOP_CENTER: 지도 상단 중앙에 배치
    <MapControl position={ControlPosition.TOP_LEFT}>
      <div className="relative mt-2.5 mx-2.5" style={{ minWidth: "280px" }}>
        {/* 검색 아이콘 */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

        {/* 검색 입력창 */}
        {/* Google Places Autocomplete가 이 input에 자동완성 드롭다운을 연결합니다 */}
        <input
          ref={inputRef}
          type="text"
          placeholder="장소 검색 (한국어, English, 中文)"
          onChange={handleInputChange}
          className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg shadow-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />

        {/* X 버튼 (검색어가 있을 때만 표시) */}
        {hasInput && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 transition-colors"
            aria-label="검색 지우기"
          >
            <X className="h-3.5 w-3.5 text-gray-400" />
          </button>
        )}
      </div>
    </MapControl>
  )
}

// ===== 실제 도로 경로를 표시하는 컴포넌트 (Directions API) =====
function DirectionsRoute({
  departure,
  destination,
  onDistanceChange,
}: {
  departure: MapPoint
  destination: MapPoint
  onDistanceChange?: (distanceKm: number | null) => void
}) {
  const map = useMap()
  const routesLibrary = useMapsLibrary("routes")
  const [directionsRenderer, setDirectionsRenderer] =
    useState<google.maps.DirectionsRenderer | null>(null)

  // DirectionsService, DirectionsRenderer 초기화
  useEffect(() => {
    if (!routesLibrary || !map) return

    const renderer = new routesLibrary.DirectionsRenderer({
      map,
      suppressMarkers: true, // 기본 마커 숨김 (커스텀 마커 사용)
      polylineOptions: {
        strokeColor: "#3182F6", // 포인트 컬러
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    })
    setDirectionsRenderer(renderer)

    return () => {
      renderer.setMap(null)
    }
  }, [routesLibrary, map])

  // 경로 요청 (출발지/도착지 변경 시)
  useEffect(() => {
    if (!routesLibrary || !directionsRenderer) return

    const service = new routesLibrary.DirectionsService()

    service.route(
      {
        origin: { lat: departure.lat, lng: departure.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status === "OK" && response) {
          directionsRenderer.setDirections(response)

          // 실제 도로 거리 추출 (meters → km 변환)
          const leg = response.routes[0]?.legs[0]
          if (leg?.distance?.value && onDistanceChange) {
            onDistanceChange(leg.distance.value / 1000)
          }
        } else {
          // Directions 실패 시 거리 null로 콜백 (fallback 사용)
          onDistanceChange?.(null)
        }
      }
    )
  }, [routesLibrary, directionsRenderer, departure.lat, departure.lng, destination.lat, destination.lng, onDistanceChange])

  return null
}

// ===== 마커 1개만 있을 때 자동 center/zoom 조절 =====
function SingleMarkerView({ point }: { point: MapPoint }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    map.setCenter({ lat: point.lat, lng: point.lng })
    map.setZoom(8)
  }, [map, point.lat, point.lng])

  return null
}

// ===== Google Maps 지도 메인 컴포넌트 =====
// 출발지/도착지 마커 + 실제 도로 경로 + 장소 검색
export default function RouteMap({
  departure,
  destination,
  onDistanceChange,
  ports,
  onPortClick,
}: RouteMapProps) {
  // 검색 결과 마커 상태
  const [searchPlace, setSearchPlace] = useState<SearchPlace | null>(null)

  // 검색 결과 선택 콜백 (MapSearchBox에서 호출)
  const handlePlaceSelect = useCallback((place: SearchPlace | null) => {
    setSearchPlace(place)
  }, [])

  // API 키 미설정 시 안내 메시지
  if (!API_KEY) {
    return (
      <div className="h-[250px] w-full rounded-lg bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">
          Google Maps API 키를 설정해주세요
        </p>
      </div>
    )
  }

  // 둘 다 없으면 렌더링 안 함 (부모에서 이미 처리하지만 안전장치)
  const hasDeparture = departure !== null
  const hasDestination = destination !== null
  const hasBoth = hasDeparture && hasDestination

  return (
    <APIProvider apiKey={API_KEY} language="ko">
      <Map
        defaultCenter={{ lat: 35, lng: 105 }}
        defaultZoom={4}
        mapId="route-map"
        className="h-[250px] w-full rounded-lg"
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
      >
        {/* 🆕 장소 검색 (지도 상단 중앙에 검색창 표시) */}
        <MapSearchBox onPlaceSelect={handlePlaceSelect} />

        {/* 실제 도로 경로 (출발지 + 도착지 모두 선택 시) */}
        {hasBoth && (
          <DirectionsRoute
            departure={departure}
            destination={destination}
            onDistanceChange={onDistanceChange}
          />
        )}

        {/* 마커 1개만 있을 때 자동 center */}
        {hasDeparture && !hasDestination && (
          <SingleMarkerView point={departure} />
        )}
        {!hasDeparture && hasDestination && (
          <SingleMarkerView point={destination} />
        )}

        {/* 출발지 마커 (파란색) */}
        {hasDeparture && (
          <AdvancedMarker
            position={{ lat: departure.lat, lng: departure.lng }}
            title={departure.label}
          >
            <Pin
              background="#3182F6"
              glyphColor="#FFFFFF"
              borderColor="#1E40AF"
              scale={1.2}
            />
          </AdvancedMarker>
        )}

        {/* 도착지 마커 (빨간색) */}
        {hasDestination && (
          <AdvancedMarker
            position={{ lat: destination.lat, lng: destination.lng }}
            title={destination.label}
          >
            <Pin
              background="#EF4444"
              glyphColor="#FFFFFF"
              borderColor="#B91C1C"
              scale={1.2}
            />
          </AdvancedMarker>
        )}

        {/* 🆕 검색 결과 마커 (녹색) - 출발지/도착지와 구분 */}
        {searchPlace && (
          <AdvancedMarker
            position={{ lat: searchPlace.lat, lng: searchPlace.lng }}
            title={`${searchPlace.name}\n${searchPlace.address}`}
          >
            <Pin
              background="#22C55E"
              glyphColor="#FFFFFF"
              borderColor="#15803D"
              scale={1.1}
            />
          </AdvancedMarker>
        )}

        {/* 항구 마커 (FCL 모드) - 비선택 항구는 주황색 작은 마커 */}
        {ports?.filter((p) => !p.isSelected).map((port) => (
          <AdvancedMarker
            key={port.id}
            position={{ lat: port.lat, lng: port.lng }}
            title={port.label}
            onClick={() => onPortClick?.(port.id)}
          >
            <Pin
              background="#F59E0B"
              glyphColor="#FFFFFF"
              borderColor="#D97706"
              scale={0.8}
            />
          </AdvancedMarker>
        ))}
      </Map>

      {/* 검색 결과 정보 표시 (지도 아래) */}
      {searchPlace && (
        <div className="mt-1.5 flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
          <span className="text-green-800 font-medium truncate">
            {searchPlace.name}
          </span>
          <span className="text-green-600 truncate">
            {searchPlace.address}
          </span>
        </div>
      )}
    </APIProvider>
  )
}
