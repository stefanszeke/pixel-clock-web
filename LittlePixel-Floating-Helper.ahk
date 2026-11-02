#Requires AutoHotkey v2.0
#SingleInstance Force
; OPTIONAL Windows helper. Toggle a focused Firefox Little Pixel Panel's
; title bar and always-on-top with Ctrl + Win + P. Toggle again to restore.
; Open Little Pixel > Window tests > Firefox Panel before using.
; This does not run until you launch the .ahk file yourself.

saved := Map()
^#p::{
    global saved
    hwnd := WinExist("A")
    if !hwnd
        return
    title := WinGetTitle("ahk_id " hwnd)
    process := WinGetProcessName("ahk_id " hwnd)
    if !(InStr(title, "Little Pixel") && process = "firefox.exe") {
        ToolTip("Focus the Little Pixel Firefox Panel first.")
        SetTimer(() => ToolTip(), -2200)
        return
    }
    key := "ahk_id " hwnd
    try {
        if saved.Has(hwnd) {
            styles := saved[hwnd]
            WinSetStyle(styles.style, key)
            WinSetAlwaysOnTop(styles.topmost ? 1 : 0, key)
            saved.Delete(hwnd)
            WinRedraw(key)
            ToolTip("Little Pixel: window frame restored")
        } else {
            oldStyle := WinGetStyle(key)
            oldExStyle := WinGetExStyle(key)
            saved[hwnd] := {style: oldStyle, topmost: !!(oldExStyle & 0x8)}
            WinSetStyle("-0xC00000", key)  ; Remove WS_CAPTION (title bar)
            WinSetAlwaysOnTop(1, key)
            WinRedraw(key)
            ToolTip("Little Pixel: borderless + pinned (Ctrl+Win+P to undo)")
        }
        SetTimer(() => ToolTip(), -2200)
    } catch Error as err {
        ToolTip("Little Pixel helper failed: " err.Message)
        SetTimer(() => ToolTip(), -3000)
    }
}
