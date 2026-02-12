"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps"

// 좌표 + 라벨 타입
interface MapPoint {
  lat: number
  lng: number
  label: string
}

interface RouteMapProps {
  departure: MapPoint | null
  destination: MapPoint | null
  // 실제 도로 거리(km) 콜백 (Directions API 결과)
  onDistanceChange?: (distanceKm: number | null) => void
}

// Google Maps API 키
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

// 실제 도로 경로를 표시하는 컴포넌트 (Directions API)
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

// 마커 1개만 있을 때 자동 center/zoom 조절
function SingleMarkerView({ point }: { point: MapPoint }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    map.setCenter({ lat: point.lat, lng: point.lng })
    map.setZoom(8)
  }, [map, point.lat, point.lng])

  return null
}

// Google Maps 지도 컴포넌트 (출발지/도착지 마커 + 실제 도로 경로)
export default function RouteMap({
  departure,
  destination,
  onDistanceChange,
}: RouteMapProps) {
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
      </Map>
    </APIProvider>
  )
}
