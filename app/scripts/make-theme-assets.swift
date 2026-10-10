// Renders the Tunes and Classic OS theme marks: a single-color lightning bolt
// (tinted with the theme accent at runtime) and a four-color flag, each as a
// header/hero mark and a Live Activity mark. Run: swift scripts/make-theme-assets.swift
import AppKit
import Foundation

let root = FileManager.default.currentDirectoryPath

func render(path: String, size: Int, _ draw: (CGFloat) -> Void) {
  let image = NSImage(size: NSSize(width: size, height: size))
  image.lockFocus()
  draw(CGFloat(size))
  image.unlockFocus()

  guard let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
        let png = rep.representation(using: .png, properties: [:]) else {
    print("failed to render \(path)")
    return
  }
  try? png.write(to: URL(fileURLWithPath: path))
  print("wrote \(path)")
}

func fill(_ points: [(CGFloat, CGFloat)], _ size: CGFloat, _ color: NSColor) {
  let path = NSBezierPath()
  path.move(to: NSPoint(x: points[0].0 * size, y: points[0].1 * size))
  for point in points.dropFirst() { path.line(to: NSPoint(x: point.0 * size, y: point.1 * size)) }
  path.close()
  color.setFill()
  path.fill()
}

// A lightning bolt on transparency, filled with the given color (white is tinted at runtime).
func bolt(_ size: CGFloat, color: NSColor = .white) {
  fill([(0.62, 0.98), (0.22, 0.54), (0.46, 0.54), (0.36, 0.02), (0.80, 0.60), (0.52, 0.60), (0.70, 0.98)], size, color)
}

// A stylized four-color waving flag: one quad per classic desktop brand color.
func flag(_ size: CGFloat) {
  let colors = [
    NSColor(red: 0.96, green: 0.44, blue: 0.13, alpha: 1),
    NSColor(red: 0.49, green: 0.73, blue: 0.00, alpha: 1),
    NSColor(red: 0.00, green: 0.63, blue: 0.95, alpha: 1),
    NSColor(red: 1.00, green: 0.73, blue: 0.00, alpha: 1),
  ]
  let quads: [[(CGFloat, CGFloat)]] = [
    [(0.08, 0.54), (0.48, 0.63), (0.48, 0.96), (0.08, 0.87)],
    [(0.52, 0.63), (0.92, 0.54), (0.92, 0.87), (0.52, 0.96)],
    [(0.08, 0.12), (0.48, 0.21), (0.48, 0.54), (0.08, 0.45)],
    [(0.52, 0.21), (0.92, 0.12), (0.92, 0.45), (0.52, 0.54)],
  ]
  for (index, quad) in quads.enumerated() { fill(quad, size, colors[index]) }
}

try? FileManager.default.createDirectory(atPath: "\(root)/assets/liveActivity", withIntermediateDirectories: true)
let gold = NSColor(red: 1.00, green: 0.824, blue: 0.247, alpha: 1) // #ffd23f, the dark Tunes mark
let orange = NSColor(red: 0.949, green: 0.545, blue: 0.0, alpha: 1) // #f28b00, the Bento accent
render(path: "\(root)/assets/logos/bolt.png", size: 256) { bolt($0) }
render(path: "\(root)/assets/logos/os.png", size: 256, flag)
render(path: "\(root)/assets/liveActivity/mark-bolt.png", size: 256) { bolt($0) }
render(path: "\(root)/assets/liveActivity/mark-bolt-gold.png", size: 256) { bolt($0, color: gold) }
render(path: "\(root)/assets/liveActivity/mark-bolt-orange.png", size: 256) { bolt($0, color: orange) }
render(path: "\(root)/assets/liveActivity/mark-os.png", size: 256, flag)
