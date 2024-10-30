"use client"

// 必要なコンポーネントをインポート

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

// Headerコンポーネントのプロパティの型定義
type HeaderProps = {
  userType: 'municipality' | 'operator' | 'resident'; // ユーザータイプ
  setUserType: (type: 'municipality' | 'operator' | 'resident') => void; // ユーザータイプを設定する関数
  drawingMode: google.maps.drawing.OverlayType | null; // 現在の描画モード
  setDrawingMode: (mode: google.maps.drawing.OverlayType | null) => void; // 描画モードを設定する関数
  isLoaded: boolean; // マップが読み込まれたかを示すフラグ
  onClearOverlays: () => void;  // 追加
};

// Headerコンポーネントの定義
export function Header({ userType, setUserType, drawingMode, setDrawingMode, isLoaded, onClearOverlays  }: HeaderProps) {
  const handleClearAll = () => {
    if (window.confirm('全ての描画された要素を削除しますか？\nこの操作は取り消せません。')) {
      onClearOverlays();
    }
  };

  return (
    // ヘッダーのスタイリング
    <header className="bg-primary text-primary-foreground p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">SkyArea10</h1> {/* アプリのタイトル */}

        <div className="flex items-center space-x-4">
          {/* ユーザータイプ選択のセレクトメニュー */}
          <Select value={userType} onValueChange={(value: 'municipality' | 'operator' | 'resident') => setUserType(value)}>
            <SelectTrigger className="w-[180px] text-black">
              <SelectValue placeholder="Select user type" />
            </SelectTrigger>
            <SelectContent>
              {/* 各ユーザータイプの選択項目 */}
              <SelectItem value="municipality">Municipality</SelectItem>
              <SelectItem value="operator">Operator</SelectItem>
              <SelectItem value="resident">Resident</SelectItem>
            </SelectContent>
          </Select>

          {/* isLoadedがtrueで、userTypeが'municipality'または'operator'の場合に表示 */}
          {isLoaded && (userType === 'municipality' || userType === 'operator') && (
            <>
              {/* userTypeに応じた描画モードを設定するボタン */}
              <Button
                variant={
                  drawingMode === (userType === 'municipality' 
                    ? google.maps.drawing.OverlayType.POLYGON 
                    : google.maps.drawing.OverlayType.POLYLINE)
                    ? "secondary" 
                    : "outline"
                } // ボタンのスタイルを描画モードに応じて変更
                onClick={() => setDrawingMode(
                  userType === 'municipality' 
                    ? google.maps.drawing.OverlayType.POLYGON 
                    : google.maps.drawing.OverlayType.POLYLINE
                )} // userTypeに応じて描画モードを設定
              >
                {/* userTypeに応じてボタンのラベルを変更 */}
                Draw {userType === 'municipality' ? 'No-Fly Zone' : 'Flight Path'}
              </Button>

              {/* 描画モードを解除するボタン */}
              <Button
                variant="outline"
                onClick={() => setDrawingMode(null)} // 描画モードをリセット
              >
                Stop Drawing
              </Button>

              {/* 全てのオーバーレイをクリアするボタン */}
              <Button
                variant="destructive"
                onClick={handleClearAll}
              >
                Clear All
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

