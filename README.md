# Marketplace Activity Analyzer

Chrome/Chromium browser extension for analyzing and tracking marketplace activity across multiple platforms.

## Supported Marketplaces

- Avito (avito.ru)
- Yandex Market (market.yandex.ru)
- Ozon (ozon.ru)
- AliExpress (aliexpress.com)
- eBay (ebay.com)

## Features

- Real-time activity tracking on marketplace pages
- Automatic data collection (listings viewed, activities logged)
- Chrome storage integration for local data persistence
- Popup dashboard with statistics
- Export activity data to JSON format
- Clear data functionality
- Support for multiple marketplaces with marketplace-specific parsers

## Project Structure

```
marketplace-analyzer/
├── manifest.json              # Extension configuration (Manifest V3)
├── README.md                  # Project documentation
├── src/
│   ├── background.js          # Background service worker
│   ├── content.js             # Content script for page injection
│   ├── popup.html             # Popup UI template
│   ├── popup.js               # Popup UI controller
│   └── styles/
│       └── popup.css          # Popup styling
└── icons/                     # Extension icons (16x16, 48x48, 128x128)
```

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable Developer Mode (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extension folder
6. The extension should now appear in your extensions list

## File Descriptions

### manifest.json
- Defines extension metadata and permissions
- Specifies background service worker and content scripts
- Declares host permissions for marketplace domains

### src/background.js
- Manages extension lifecycle and data storage
- Handles message passing between content scripts and popup
- Stores activity logs (max 1000 entries)
- Provides stats calculation functions

### src/content.js
- Injected into marketplace pages
- Detects marketplace type
- Collects listing data (titles, prices, seller info)
- Sends data to background service worker

### src/popup.html
- User interface for extension popup
- Displays statistics and recent activities
- Buttons for exporting and clearing data

### src/popup.js
- Controls popup functionality
- Loads and displays statistics
- Handles export and clear operations

### src/styles/popup.css
- Popup styling and layout
- Responsive grid for statistics
- Activity list styling

## Development

The extension uses:
- Chrome Storage API for local data persistence
- Chrome Runtime for message passing
- Fetch API for potential cloud sync (future)

## Data Storage

All data is stored locally in Chrome's storage:
- `activity_log`: Array of user activities
- `listings_data`: Marketplace listing information
- `extension_settings`: User preferences

## Future Features

- Cloud synchronization
- Data filtering and search
- Statistics graphs and charts
- Custom alerts for price changes
- Cross-device synchronization
- Advanced analytics dashboard

## License

MIT License - Feel free to use and modify

## Author

Mikawo846
