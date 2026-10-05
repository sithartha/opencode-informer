// Renders the "OI" white-on-black brand mark: the 1024px app icon and a crisp
// Live Activity mark. Run: swift scripts/make-brand-assets.swift
import AppKit
import Foundation

let root = FileManager.default.currentDirectoryPath

func render(path: String, size: Int, fontSize: CGFloat) {
  let image = NSImage(size: NSSize(width: size, height: size))
  image.lockFocus()
  NSColor.black.setFill()
  NSRect(x: 0, y: 0, width: size, height: size).fill()

  let text = "OI" as NSString
  let font = NSFont.systemFont(ofSize: fontSize, weight: .heavy)
  let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white]
  let textSize = text.size(withAttributes: attributes)
  text.draw(
    at: NSPoint(x: (CGFloat(size) - textSize.width) / 2, y: (CGFloat(size) - textSize.height) / 2),
    withAttributes: attributes
  )
  image.unlockFocus()

  guard let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
        let png = rep.representation(using: .png, properties: [:]) else {
    print("failed to render \(path)")
    return
  }
  try? png.write(to: URL(fileURLWithPath: path))
  let bytes = (try? FileManager.default.attributesOfItem(atPath: path)[.size] as? NSNumber)?.intValue ?? 0
  print("wrote \(path) (\(bytes) bytes)")
}

render(path: "\(root)/assets/icon.png", size: 1024, fontSize: 470)
try? FileManager.default.createDirectory(atPath: "\(root)/assets/liveActivity", withIntermediateDirectories: true)
render(path: "\(root)/assets/liveActivity/oi.png", size: 180, fontSize: 120)
