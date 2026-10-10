import SwiftUI
import WidgetKit

#if canImport(ActivityKit)

  struct ConditionalForegroundViewModifier: ViewModifier {
    let color: String?

    func body(content: Content) -> some View {
      if let color = color {
        content.foregroundStyle(Color(hex: color))
      } else {
        content
      }
    }
  }

  struct DebugLog: View {
    #if DEBUG
      private let message: String
      init(_ message: String) {
        self.message = message
        print(message)
      }

      var body: some View {
        Text(message)
          .font(.caption2)
          .foregroundStyle(.red)
      }
    #else
      init(_: String) {}
      var body: some View { EmptyView() }
    #endif
  }

  struct LiveActivityView: View {
    let contentState: LiveActivityAttributes.ContentState
    let attributes: LiveActivityAttributes
    // Set by the system once the activity's staleDate passes (no update for a
    // while — the app is suspended or the Mac is unreachable).
    var isStale: Bool = false
    @State private var imageContainerSize: CGSize?

    var progressViewTint: Color? {
      attributes.progressViewTint.map { Color(hex: $0) }
    }

    private var imageAlignment: Alignment {
      switch attributes.imageAlign {
      case "center":
        return .center
      case "bottom":
        return .bottom
      default:
        return .top
      }
    }

    private func alignedImage(imageName: String) -> some View {
      let defaultHeight: CGFloat = 64
      let defaultWidth: CGFloat = 64
      let containerHeight = imageContainerSize?.height
      let containerWidth = imageContainerSize?.width
      let hasWidthConstraint = (attributes.imageWidthPercent != nil) || (attributes.imageWidth != nil)

      let computedHeight: CGFloat? = {
        if let percent = attributes.imageHeightPercent {
          let clamped = min(max(percent, 0), 100) / 100.0
          // Use the row height as a base. Fallback to default when row height is not measured yet.
          let base = (containerHeight ?? defaultHeight)
          return base * clamped
        } else if let size = attributes.imageHeight {
          return CGFloat(size)
        } else if hasWidthConstraint {
          // Mimic CSS: when only width is set, keep height automatic to preserve aspect ratio
          return nil
        } else {
          // Mimic CSS: this works against CSS but provides a better default behavior.
          // When no width/height is set, use a default size (64pt)
          // Width will adjust automatically base on aspect ratio
          return defaultHeight
        }
      }()

      let computedWidth: CGFloat? = {
        if let percent = attributes.imageWidthPercent {
          let clamped = min(max(percent, 0), 100) / 100.0
          let base = (containerWidth ?? defaultWidth)
          return base * clamped
        } else if let size = attributes.imageWidth {
          return CGFloat(size)
        } else {
          return nil // Keep aspect fit based on height
        }
      }()

      return ZStack(alignment: .center) {
        Group {
          let fit = attributes.contentFit ?? "cover"
          switch fit {
          case "contain":
            Image.dynamic(assetNameOrPath: imageName).resizable().scaledToFit().frame(width: computedWidth, height: computedHeight)
          case "fill":
            Image.dynamic(assetNameOrPath: imageName).resizable().frame(
              width: computedWidth,
              height: computedHeight
            )
          case "none":
            Image.dynamic(assetNameOrPath: imageName).renderingMode(.original).frame(width: computedWidth, height: computedHeight)
          case "scale-down":
            if let uiImage = UIImage.dynamic(assetNameOrPath: imageName) {
              // Determine the target box. When width/height are nil, we use image's intrinsic dimension for comparison.
              let targetHeight = computedHeight ?? uiImage.size.height
              let targetWidth = computedWidth ?? uiImage.size.width
              let shouldScaleDown = uiImage.size.height > targetHeight || uiImage.size.width > targetWidth

              if shouldScaleDown {
                Image(uiImage: uiImage)
                  .resizable()
                  .scaledToFit()
                  .frame(width: computedWidth, height: computedHeight)
              } else {
                Image(uiImage: uiImage)
                  .renderingMode(.original)
                  .frame(width: min(uiImage.size.width, targetWidth), height: min(uiImage.size.height, targetHeight))
              }
            } else {
              DebugLog("⚠️[ExpoLiveActivity] assetNameOrPath couldn't resolve to UIImage")
            }
          case "cover":
            Image.dynamic(assetNameOrPath: imageName).resizable().scaledToFill().frame(
              width: computedWidth,
              height: computedHeight
            ).clipped()
          default:
            DebugLog("⚠️[ExpoLiveActivity] Unknown contentFit '\(fit)'")
          }
        }
      }
      .frame(maxHeight: .infinity, alignment: imageAlignment)
      .background(
        GeometryReader { proxy in
          Color.clear
            .onAppear {
              let s = proxy.size
              if s.width > 0, s.height > 0 { imageContainerSize = s }
            }
            .onChange(of: proxy.size) { s in
              if s.width > 0, s.height > 0 { imageContainerSize = s }
            }
        }
      )
    }

    var body: some View {
      let defaultPadding = 24

      let top = CGFloat(
        attributes.paddingDetails?.top
          ?? attributes.paddingDetails?.vertical
          ?? attributes.padding
          ?? defaultPadding
      )

      let bottom = CGFloat(
        attributes.paddingDetails?.bottom
          ?? attributes.paddingDetails?.vertical
          ?? attributes.padding
          ?? defaultPadding
      )

      let leading = CGFloat(
        attributes.paddingDetails?.left
          ?? attributes.paddingDetails?.horizontal
          ?? attributes.padding
          ?? defaultPadding
      )

      let trailing = CGFloat(
        attributes.paddingDetails?.right
          ?? attributes.paddingDetails?.horizontal
          ?? attributes.padding
          ?? defaultPadding
      )

      let total = parseTotal(contentState.title)
      let rows = parseIndicators(contentState.subtitle)
        + (isStale ? [IndicatorRow(text: "stale · not updating", color: "#FF9F0A")] : [])
      let labelColor = Color(hex: attributes.subtitleColor ?? "#DDDDDD")

      VStack(spacing: 0) {
        accentBar
        HStack(alignment: .center, spacing: 16) {
        if total.number.isEmpty {
          // Status line (e.g. "No connection"): plain text, no count or dots.
          VStack(alignment: .leading, spacing: 3) {
            Text(contentState.title)
              .font(.headline)
              .fontWeight(.semibold)
              .modifier(ConditionalForegroundViewModifier(color: attributes.titleColor))
            if let subtitle = contentState.subtitle, !subtitle.isEmpty {
              Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(labelColor)
            }
          }
          .layoutPriority(1)
        } else {
          // Big agent count, with a small "agents" label underneath. The minimum
          // width keeps the label ("agent"/"agents") on one line.
          VStack(alignment: .leading, spacing: 0) {
            Text(total.number)
              .font(.system(size: 60, weight: .bold))
              .modifier(ConditionalForegroundViewModifier(color: attributes.titleColor))
            Text(total.label)
              .font(.caption)
              .foregroundStyle(labelColor)
              .fixedSize(horizontal: true, vertical: false)
          }
          .frame(minWidth: 59, alignment: .leading)

          // The theme caption (dot-less, in the theme accent) plus one small,
          // vertically-centred dot per attention-state line.
          VStack(alignment: .leading, spacing: 5) {
            ForEach(rows, id: \.self) { row in
              if row.isHeader {
                Text(row.text)
                  .font(.caption2)
                  .fontWeight(.semibold)
                  .tracking(1.2)
                  .foregroundStyle(progressViewTint ?? labelColor)
              } else {
                HStack(spacing: 7) {
                  Circle()
                    .fill(Color(hex: row.color))
                    .frame(width: 5, height: 5)
                  Text(row.text)
                    .font(.subheadline)
                    .foregroundStyle(labelColor)
                }
              }
            }
          }.layoutPriority(1)
        }

        Spacer(minLength: 8)

        if let imageName = contentState.imageName {
          alignedImage(imageName: imageName)
        }
        }
        .padding(EdgeInsets(top: top, leading: leading, bottom: bottom, trailing: trailing))
      }
      .background(watermark)
      .opacity(isStale ? 0.55 : 1)
    }

    /// A large, semi-transparent theme mark behind the content — the activity's
    /// echo of the dashboard hero's watermark. It is a square 150% of the card's
    /// height, its top-right corner pushed 40% of its own size right and up past the
    /// card's top-right, so ~60% of it shows (the rest is cropped by the card).
    @ViewBuilder
    private var watermark: some View {
      if let imageName = contentState.imageName {
        GeometryReader { proxy in
          Image.dynamic(assetNameOrPath: imageName)
            .resizable()
            .scaledToFit()
            .frame(width: proxy.size.height * 1.5, height: proxy.size.height * 1.5)
            .opacity(0.18)
            .frame(width: proxy.size.width, height: proxy.size.height, alignment: .topTrailing)
            .offset(x: proxy.size.height * 0.6, y: -proxy.size.height * 0.6)
        }
        .clipped()
      }
    }

    /// A thin accent line across the top of the card, echoing the hero's accent
    /// divider / lightsaber / hazard rail (color carried by `progressViewTint`).
    private var accentBar: some View {
      Group {
        if let accent = progressViewTint {
          LinearGradient(
            colors: [accent.opacity(0), accent, accent.opacity(0)],
            startPoint: .leading,
            endPoint: .trailing
          )
          .frame(height: 3)
        }
      }
    }

    private struct IndicatorRow: Hashable {
      let text: String
      let color: String
      var isHeader: Bool = false
    }

    /// "3 agents" -> ("3", "agents"); a non-numeric title is a status line.
    private func parseTotal(_ title: String) -> (number: String, label: String) {
      let parts = title.split(separator: " ", maxSplits: 1).map(String.init)
      if let first = parts.first, !first.isEmpty, first.allSatisfy({ $0.isNumber }) {
        return (first, parts.count > 1 ? parts[1] : "")
      }
      return ("", title)
    }

    /// Turn "<count> <label>" lines into indicator rows with a dot color; a
    /// "#"-prefixed line is the theme's hero label + status, rendered as a caption.
    private func parseIndicators(_ subtitle: String?) -> [IndicatorRow] {
      guard let subtitle else { return [] }
      return subtitle.split(separator: "\n").map { line in
        var text = String(line)
        if text.hasPrefix("# ") {
          text = String(text.dropFirst(2)).uppercased()
          return IndicatorRow(text: text, color: "#8E8E93", isHeader: true)
        }
        let lowered = text.lowercased()
        let color: String
        if lowered.contains("permission") {
          color = "#FF9F0A" // iOS system orange
        } else if lowered.contains("question") {
          color = "#0A84FF" // iOS system blue
        } else if lowered.contains("working") {
          color = "#30D158" // iOS system green
        } else {
          color = "#8E8E93" // iOS system gray (inactive, stale)
        }
        return IndicatorRow(text: text, color: color)
      }
    }
  }

#endif
