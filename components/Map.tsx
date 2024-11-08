"use client"

import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, DrawingManager, Polygon, Polyline, Marker } from '@react-google-maps/api';
import { useToast } from "@/components/ui/use-toast";

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 35.6762,
  lng: 139.6503,
};

type MapProps = {
  userType: 'municipality' | 'operator' | 'resident';
  drawingMode: google.maps.drawing.OverlayType | null;
  setDrawingMode: (mode: google.maps.drawing.OverlayType | null) => void;
  onClearOverlays: (fn: () => void) => void;
  setWarning: (warning: string | null) => void;
};

type Overlay = {
  type: google.maps.drawing.OverlayType;
  overlay: google.maps.Polygon | google.maps.Polyline | google.maps.Marker;
  options: google.maps.PolygonOptions | google.maps.PolylineOptions | google.maps.MarkerOptions;
};

const defaultPolygonOptions: google.maps.PolygonOptions = {
  fillColor: "#FF0000",
  fillOpacity: 0.35,
  strokeWeight: 2,
  clickable: true,
  editable: true,
  zIndex: 1,
};

const defaultPolylineOptions: google.maps.PolylineOptions = {
  strokeColor: "#0000FF",
  strokeWeight: 2,
  clickable: true,
  editable: true,
  zIndex: 1,
};

const defaultMarkerOptions: google.maps.MarkerOptions = {
  draggable: false,
  clickable: true,
  icon: {
    url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
    scaledSize: new google.maps.Size(20, 20),
  },
};

const selectedPolygonOptions: google.maps.PolygonOptions = {
  fillColor: "#00FF00",
  fillOpacity: 0.5,
  strokeWeight: 3,
  clickable: true,
  editable: true,
  zIndex: 2,
};

const selectedPolylineOptions: google.maps.PolylineOptions = {
  strokeColor: "#FF00FF",
  strokeWeight: 3,
  clickable: true,
  editable: true,
  zIndex: 2,
};

export default function Map({ userType, drawingMode, setDrawingMode, onClearOverlays, setWarning, setIsEditMode }: MapProps & { setIsEditMode: (isEditMode: boolean) => void }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedOverlay, setSelectedOverlay] = useState<Overlay | null>(null);

  const { toast } = useToast()

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  useEffect(() => {
    if (map) {
      if (drawingManager) drawingManager.setMap(null);
      
      const newDrawingManager = new window.google.maps.drawing.DrawingManager({
        drawingMode: drawingMode,
        drawingControl: false,
        polygonOptions: defaultPolygonOptions,
        polylineOptions: defaultPolylineOptions,
        markerOptions: defaultMarkerOptions,
      });
      newDrawingManager.setMap(map);
      setDrawingManager(newDrawingManager);

      google.maps.event.addListener(newDrawingManager, 'overlaycomplete', handleOverlayComplete);
    }
  }, [map, drawingMode, userType]);

  const handleOverlayComplete = (event: google.maps.drawing.OverlayCompleteEvent) => {
    console.log("オーバーレイ作成イベント:", event.type);

    let overlay: google.maps.Polygon | google.maps.Polyline | google.maps.Marker;
    
    if (event.type === google.maps.drawing.OverlayType.POLYGON) {
      overlay = event.overlay as google.maps.Polygon;
    } else if (event.type === google.maps.drawing.OverlayType.POLYLINE) {
      overlay = event.overlay as google.maps.Polyline;

      const path = overlay.getPath();
      const isCrossingNoFlyZone = overlays.some(({ overlay: noFlyZone }) => {
        if (noFlyZone instanceof google.maps.Polygon) {
          for (let i = 0; i < path.getLength() - 1; i++) {
            const start = path.getAt(i);
            const end = path.getAt(i + 1);
            const numPoints = 10;
            for (let j = 0; j <= numPoints; j++) {
              const fraction = j / numPoints;
              const lat = start.lat() + (end.lat() - start.lat()) * fraction;
              const lng = start.lng() + (end.lng() - start.lng()) * fraction;
              const point = new google.maps.LatLng(lat, lng);
              
              if (google.maps.geometry.poly.containsLocation(point, noFlyZone)) {
                return true;
              }
            }
          }
        }
        return false;
      });

      if (isCrossingNoFlyZone) {
        setWarning("飛行禁止区域であるため飛行経路に設定できません。");
        overlay.setMap(null);
        return;
      } else {
        setWarning(null);
      }
    } else {
      overlay = event.overlay as google.maps.Marker;
    }

    overlay.setMap(map);

    const newOverlay: Overlay = {
      type: event.type,
      overlay: overlay,
      options: event.type === google.maps.drawing.OverlayType.POLYGON
        ? defaultPolygonOptions
        : event.type === google.maps.drawing.OverlayType.POLYLINE
        ? defaultPolylineOptions
        : {}
    };

    console.log("新しいオーバーレイを追加:", newOverlay);

    setOverlays(prevOverlays => {
      console.log("現在のオーバーレイ:", prevOverlays);
      return [...prevOverlays, newOverlay];
    });

    if (event.type === google.maps.drawing.OverlayType.POLYGON) {
      toast({
        title: "No-fly zone created",
        description: "A new no-fly zone has been added to the map.",
      })
    } else if (event.type === google.maps.drawing.OverlayType.POLYLINE) {
      toast({
        title: "Flight path created",
        description: "A new flight path has been added to the map.",
      })
    } else if (event.type === google.maps.drawing.OverlayType.MARKER) {
      toast({
        title: "Report submitted",
        description: "Your report has been submitted successfully.",
      })
    }
    setDrawingMode(null);
  };

const clearOverlays = useCallback(() => {
  console.log("clearOverlays関数が実行されました");
  console.log("現在のオーバーレイ数:", overlays.length);

  overlays.forEach(({ overlay, type }) => {
    console.log("オーバーレイのタイプ:", type);
    overlay.setMap(null);

    if (overlay instanceof google.maps.Polygon) {
      overlay.setEditable(false);
    } else if (overlay instanceof google.maps.Polyline) {
      overlay.setEditable(false);
    }
  });

  if (drawingManager) {
    drawingManager.setMap(null);
    const newDrawingManager = new window.google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: defaultPolygonOptions,
      polylineOptions: defaultPolylineOptions,
      markerOptions: defaultMarkerOptions,
    });
    newDrawingManager.setMap(map);
    setDrawingManager(newDrawingManager);
  }

  setOverlays([]);
  
  toast({
    title: "Cleared",
    description: "All overlays have been removed from the map.",
  });
}, [overlays, toast, drawingManager, map]);

useEffect(() => {
  if (drawingMode === null) {
    overlays.forEach(({ overlay, type }) => {
      if (overlay instanceof google.maps.Polygon) {
        overlay.setEditable(false);
      } else if (overlay instanceof google.maps.Polyline) {
        overlay.setEditable(false);
      }      
    });
  }
}, [drawingMode, overlays]);

useEffect(() => {
  if (drawingMode !== null) {
    overlays.forEach(({ overlay, type }) => {
      if (overlay instanceof google.maps.Polygon) {
        overlay.setEditable(true);
      } else if (overlay instanceof google.maps.Polyline) {
        overlay.setEditable(true);
      }      
    });
  }
}, [drawingMode, overlays]);

const handlePolylineClick = (overlay: google.maps.Polyline) => {
  if (selectedOverlay) {
    resetOverlayStyle(selectedOverlay);
  }
  setSelectedOverlay({ type: google.maps.drawing.OverlayType.POLYLINE, overlay, options: selectedPolylineOptions });
  overlay.setOptions(selectedPolylineOptions);
};

const handlePolygonClick = (overlay: google.maps.Polygon) => {
  if (selectedOverlay) {
    resetOverlayStyle(selectedOverlay);
  }
  setSelectedOverlay({ type: google.maps.drawing.OverlayType.POLYGON, overlay, options: selectedPolygonOptions });
  overlay.setOptions(selectedPolygonOptions);
};

const resetOverlayStyle = (overlay: Overlay) => {
  if (overlay.type === google.maps.drawing.OverlayType.POLYGON) {
    (overlay.overlay as google.maps.Polygon).setOptions(defaultPolygonOptions);
  } else if (overlay.type === google.maps.drawing.OverlayType.POLYLINE) {
    (overlay.overlay as google.maps.Polyline).setOptions(defaultPolylineOptions);
  }
};

useEffect(() => {
  overlays.forEach(({ overlay, type }) => {
    if (overlay instanceof google.maps.Polyline) {
      google.maps.event.addListener(overlay, 'click', () => handlePolylineClick(overlay));
    } else if (overlay instanceof google.maps.Polygon) {
      google.maps.event.addListener(overlay, 'click', () => handlePolygonClick(overlay));
    }
  });
}, [overlays]);

const handleEditButtonClick = () => {
  if (selectedOverlay && (selectedOverlay.overlay instanceof google.maps.Polygon || selectedOverlay.overlay instanceof google.maps.Polyline)) {
    selectedOverlay.overlay.setEditable(true);
    setIsEditMode(true);
  }
};

const handleConfirmButtonClick = () => {
  exitEditMode();
};

const exitEditMode = () => {
  setIsEditMode(false);
  if (selectedOverlay) {
    resetOverlayStyle(selectedOverlay);
    if (selectedOverlay.overlay instanceof google.maps.Polygon || selectedOverlay.overlay instanceof google.maps.Polyline) {
      selectedOverlay.overlay.setEditable(false);
    }
    setSelectedOverlay(null);
  }
};

useEffect(() => {
  if (drawingMode !== null) {
    exitEditMode(); // 描画モードに移ったときに編集モードを終了
  }
}, [drawingMode]);

useEffect(() => {
  if (userType !== 'operator' && userType !== 'municipality') {
    exitEditMode(); // 他のカテゴリに移ったときに編集モードを終了
  }
}, [userType]);

  return (     
    <div className="relative h-full">
      {selectedOverlay && (
        <div className="absolute top-0 left-0 bg-white p-2 rounded shadow-lg z-10">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleEditButtonClick}
          >
            編集
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded ml-2"
            onClick={() => {
              selectedOverlay.overlay.setMap(null);
              setOverlays(overlays.filter(o => o !== selectedOverlay));
              exitEditMode(); // オーバーレイを削除したときに編集モードを終了
            }}
          >
            削除
          </button>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded ml-2"
            onClick={handleConfirmButtonClick}
          >
            確定
          </button>
        </div>
      )}

      {/* ガイドメッセージ */}
      {userType === 'operator' && drawingMode === google.maps.drawing.OverlayType.POLYLINE && (
        <div className="absolute top-14 left-2.5 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-10">
          確定するには終点とする点をクリック
        </div>
      )}
      
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {drawingManager && (
          <DrawingManager
            drawingMode={drawingMode}
            options={{
              drawingControl: false,
              polygonOptions: defaultPolygonOptions,
              polylineOptions: defaultPolylineOptions,
              markerOptions: defaultMarkerOptions,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}