# Recommended APIs & Data Sources

This document lists the APIs and data sources that work best with the Nepali Calendar Plugin based on your requirements.

## 🏆 Primary Recommended APIs

### 1. **nepali-calendar-api** (Best Overall)
**Repository**: https://github.com/bibhuticoder/nepali-calendar-api
**Status**: ✅ Recommended for Tithi & Festival Data

**Features**:
- Both AD (Gregorian) and BS (Nepali) dates
- Tithi (lunar day) information
- Nepal-specific holidays and festivals
- Data available as static JSON files
- Coverage: 1992 BS onwards
- No authentication needed

**Integration**:
```typescript
// Fetch festival data from GitHub
const response = await fetch(
  'https://raw.githubusercontent.com/bibhuticoder/nepali-calendar-api/master/data/festivals.json'
);
const festivals = await response.json();
```

**Pros**:
- Free, no quota limits
- Comprehensive festival database
- Lightweight JSON format
- Actively maintained

**Cons**:
- Doesn't provide real-time tithi calculations
- Limited to pre-computed data

---

### 2. **the-value-crew/nepali-calendar-api** (Alternative)
**Repository**: https://github.com/the-value-crew/nepali-calendar-api
**Status**: ✅ Alternative Source

**Features**:
- Data from 1992 BS to present
- Tithi, festivals, holidays
- Marriage and bratabandha dates
- Monthly calendar data

**Pros**:
- Structured JSON format
- Good for historical data

---

### 3. **nepali-calendar-js** (Best for Conversions)
**NPM Package**: https://www.npmjs.com/package/nepali-calendar-js
**Status**: ✅ Already Integrated

**Features**:
- Pure JavaScript implementation
- Convert between Nepali and Gregorian calendars
- Works in browser and Node.js
- No external dependencies
- Coverage: 2000 BS to 2090 BS

**Installation**:
```bash
npm install nepali-calendar-js
```

**Usage**:
```typescript
import nepaliCalendar from 'nepali-calendar-js';

// Convert to Nepali
const nepaliDate = nepaliCalendar.toBS(new Date(2024, 10, 7));

// Convert to Gregorian
const gregorianDate = nepaliCalendar.toAD(2081, 7, 22);
```

**Pros**:
- Accurate conversions
- NPM package (easy install)
- Well-maintained

---

## 🔗 Google APIs Required

### **Google Calendar API v3**
**Endpoint**: https://www.googleapis.com/calendar/v3
**Status**: ✅ Already Integrated

**Features**:
- Full CRUD operations for events
- Calendar management
- Recurring events
- Reminders and notifications
- Rate limit: 1 million queries per day (per user)

**Authentication**: OAuth 2.0

**Key Endpoints**:
```
GET  /calendars/primary                    # Get primary calendar
GET  /calendars/calendarId/events         # List events
POST /calendars/calendarId/events         # Create event
PATCH /calendars/calendarId/events/{id}   # Update event
DELETE /calendars/calendarId/events/{id}  # Delete event
```

---

## 📊 Festival Data Sources

### **Built-in Festival Database**
Included in `src/utils/nepaliCalendar.ts`

**Pre-configured Festivals**:
- Prithvi Jayanti (Baisakh 1)
- Teej (Shrawan 16)
- Dashain (Ashoj 1-15)
- Tihar (Kartik 1-5)
- Chhath (Kartik 20)
- Maha Shivaratri (Falgun 14)
- Holi (Falgun 15)

### **External Festival Sources**
- https://nepalicalendar.rat32.com/
- https://nepalipatro.com.np/
- https://datetimenepal.com/

**Note**: These sites can be web-scraped for current festival data if needed.

---

## 🌍 Optional Enhancement APIs

### **If You Want Real-Time Astronomical Data**

#### **Timeanddate.com API** (Premium)
**Website**: https://www.timeanddate.com/api
**Status**: Optional Enhancement

**Features**:
- Precise sunrise/sunset times
- Lunar phase calculations
- Holiday calendars

**Pricing**: Starts at $19/month

**Use Case**: If you need exact tithi transition times

---

#### **AstrologyAPI** (Premium)
**Website**: https://www.astrologyapi.com
**Status**: Optional Enhancement

**Features**:
- Precise tithi calculations
- Lunar phase details
- Auspicious timing

**Use Case**: For advanced lunar event scheduling

---

## 📱 Optional: Mobile & Third-Party Integrations

### **Nepali Calendar Mobile Apps** (Data Reference)
- Ramro Patro (Android/iOS)
- Nepali Patro (Android/iOS)
- BhittePatro (Web)

**Use**: Reference for festival accuracy and date validation

---

## 🔄 Recommended Integration Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Your Plugin                         │
└──────────────────────────────────────────────────────┘
           ↓              ↓              ↓
    ┌──────────┐  ┌──────────┐  ┌──────────────┐
    │ Nepali   │  │ Google   │  │ Custom       │
    │ Calendar │  │ Calendar │  │ Events/Data  │
    │ Library  │  │ API      │  │              │
    └──────────┘  └──────────┘  └──────────────┘
         ↓              ↓              ↓
    ┌──────────────────────────────────────────────────┐
    │           Data & Services Layer                  │
    └──────────────────────────────────────────────────┘
```

---

## 🎯 Recommended Implementation Sequence

### **Phase 1: Core (Already Done)**
- ✅ Calendar conversions (nepali-calendar-js)
- ✅ Festival database (built-in)
- ✅ Google Calendar API integration

### **Phase 2: Enhancement (Optional)**
- □ Add nepali-calendar-api for real-time festival updates
- □ Implement web scraping for current festival dates
- □ Add Timeanddate.com for solar/lunar precision

### **Phase 3: Advanced (Optional)**
- □ Add astrological calculations
- □ Implement WebSocket for real-time updates
- □ Add multi-calendar support

---

## 📋 API Comparison Table

| API | Purpose | Cost | Accuracy | Integration |
|-----|---------|------|----------|-------------|
| **nepali-calendar-js** | Date conversion | Free | High | Easy (NPM) |
| **nepali-calendar-api** | Festival data | Free | High | REST API |
| **Google Calendar API** | Event sync | Free* | N/A | OAuth 2.0 |
| **Timeanddate API** | Astronomical | $19+/mo | Very High | REST API |
| **AstrologyAPI** | Tithi precision | $10+/mo | Very High | REST API |

*Google Calendar: Free quota, paid tiers available

---

## 🔐 Security Considerations for APIs

### **API Keys Management**
- Store all keys in `.env.local`
- Never commit `.env` files to git
- Rotate keys regularly
- Use environment-specific credentials

### **Rate Limiting**
- Google Calendar: 1M requests/day (user level)
- Implement request caching
- Use batch operations when possible

### **CORS & Server-Side Calls**
- Call APIs from backend when possible
- For frontend, use CORS proxies or server endpoints
- Implement rate limiting on your backend

---

## 🚀 Implementation Examples

### **Using nepali-calendar-js**
```typescript
import nepaliCalendar from 'nepali-calendar-js';

// Convert date
const bs = nepaliCalendar.toBS(new Date());
console.log(`Today is: ${bs.year}-${bs.month}-${bs.day}`);

// Get year info
const yearInfo = nepaliCalendar.getYearInfo(2081);
console.log(`${yearInfo.englishName}: ${yearInfo.daysInYear} days`);
```

### **Fetching Festival Data**
```typescript
async function getFestivals() {
  const response = await fetch(
    'https://raw.githubusercontent.com/bibhuticoder/nepali-calendar-api/master/data/2081.json'
  );
  const data = await response.json();
  return data.festivals;
}
```

### **Google Calendar Event**
```typescript
const event = {
  summary: 'Dashain 2081',
  description: 'Major Nepali festival',
  start: { date: '2024-09-25' },
  end: { date: '2024-10-10' },
  reminders: {
    useDefault: true
  }
};

await googleCalendarService.createEvent('primary', event);
```

---

## 📚 Additional Resources

### **Nepali Calendar Information**
- https://en.wikipedia.org/wiki/Nepali_calendar
- https://www.britannica.com/topic/calendar
- https://timeanddate.com/calendar

### **Google Calendar API**
- https://developers.google.com/calendar/api
- https://developers.google.com/calendar/v3/reference
- https://cloud.google.com/docs/authentication/oauth2

### **Bikram Sambat Details**
- https://en.wikipedia.org/wiki/Bikram_Sambat
- https://www.britannica.com/topic/Nepali-calendar

---

## ✅ API Selection Summary

**For Your Plugin, We Recommend**:

1. **Primary**: Use built-in utilities + `nepali-calendar-js` ✅
2. **Secondary**: Optional fetch from `nepali-calendar-api` for enhanced data
3. **Core**: Google Calendar API (already integrated) ✅
4. **Enhancement**: Timeanddate API (optional, for astronomical accuracy)

**Current Implementation**: ✅ Already includes all essential APIs

The plugin is ready to use with the currently integrated APIs. Additional APIs are optional enhancements for advanced features.

---

## 🎯 Next Steps

1. **Integrate nepali-calendar-js** (optional, already in package.json)
   ```bash
   npm install nepali-calendar-js
   ```

2. **Test with built-in data** (no additional API calls needed)

3. **Add external APIs later** if you need real-time updates

4. **Monitor Google Calendar API quotas** as your user base grows

---

**Last Updated**: November 7, 2024
**Plugin Version**: 1.0.0
