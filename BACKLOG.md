# VoiceBot Researcher Pro - Product Backlog

## Epic 1: Sighted User Experience
*Make the app useful for sighted users with visual feedback and UI enhancements*

### High Priority

#### 1.1 Citation Cards Display
**As a** sighted user  
**I want** to see search results as visual cards  
**So that** I can scan and reference papers while listening

**Acceptance Criteria:**
- [ ] Display paper cards with title, authors, journal, year
- [ ] Show abstract preview (expandable)
- [ ] Include clickable PubMed link
- [ ] MeSH terms as tags/chips
- [ ] Highlight currently-being-read card

---

#### 1.2 Conversation Transcript
**As a** sighted user  
**I want** to see a live transcript of the conversation  
**So that** I can follow along and reference what was said

**Acceptance Criteria:**
- [ ] Real-time transcript display
- [ ] Distinguish user vs bot messages
- [ ] Auto-scroll to latest
- [ ] Timestamps optional

---

#### 1.3 Visual Waveform / Audio Feedback
**As a** sighted user  
**I want** visual feedback showing audio activity  
**So that** I know when I'm being heard or when bot is speaking

**Acceptance Criteria:**
- [ ] Animated waveform during speaking
- [ ] Different visual for listening vs speaking
- [ ] Integrate with StatusIndicator component

---

### Medium Priority

#### 1.4 Search History Sidebar
**As a** returning user  
**I want** to see my recent searches  
**So that** I can quickly revisit previous queries

---

#### 1.5 Export / Copy Citations
**As a** researcher  
**I want** to copy citations in standard formats (APA, MLA, BibTeX)  
**So that** I can use them in my papers

---

#### 1.6 Mute/Unmute Toggle Button
**As a** user in a shared space  
**I want** a visible mute button  
**So that** I can control microphone without keyboard

---

### Low Priority

#### 1.7 Dark/Light Theme Toggle
#### 1.8 Reading Speed Control
#### 1.9 Favorite/Bookmark Papers

---

## Epic 2: Mobile / iPhone Support
*Make the app fully functional on iOS Safari and as a PWA*

### High Priority

#### 2.1 Responsive Layout
**As a** mobile user  
**I want** the UI to adapt to small screens  
**So that** I can use the app on my phone

**Acceptance Criteria:**
- [ ] Single-column layout on mobile
- [ ] Touch-friendly button sizes (min 44px)
- [ ] No horizontal scroll
- [ ] Status indicator scales appropriately

---

#### 2.2 iOS Safari WebRTC Compatibility
**As an** iPhone user  
**I want** the voice features to work in Safari  
**So that** I can use the app without installing anything

**Acceptance Criteria:**
- [ ] Test and fix WebRTC on iOS Safari
- [ ] Handle iOS audio session restrictions
- [ ] Ensure autoplay works after user gesture

---

#### 2.3 PWA Installation
**As a** mobile user  
**I want** to "Add to Home Screen"  
**So that** I can launch the app like a native app

**Acceptance Criteria:**
- [ ] Add manifest.json with icons
- [ ] Configure service worker for offline shell
- [ ] Splash screen
- [ ] Standalone display mode

---

### Medium Priority

#### 2.4 Touch-to-Talk Alternative
**As a** mobile user  
**I want** a large "hold to talk" button  
**So that** I can control when I'm speaking without wake word

---

#### 2.5 Haptic Feedback
**As an** iPhone user  
**I want** haptic vibration on state changes  
**So that** I get tactile confirmation

---

#### 2.6 Portrait/Landscape Support
**As a** tablet user  
**I want** the layout to work in both orientations

---

### Low Priority

#### 2.7 Offline Mode (Cached Results)
#### 2.8 Share Results via iOS Share Sheet
#### 2.9 Siri Shortcut Integration

---

## Prioritization Matrix

| Epic | Story | Impact | Effort | Priority |
|:--|:--|:--|:--|:--|
| Sighted UX | Citation Cards | High | Medium | P1 |
| Mobile | Responsive Layout | High | Low | P1 |
| Mobile | iOS Safari WebRTC | High | High | P1 |
| Sighted UX | Transcript | Medium | Medium | P2 |
| Mobile | PWA Install | Medium | Low | P2 |
| Sighted UX | Waveform | Low | Medium | P3 |
| Mobile | Touch-to-Talk | Medium | Low | P2 |

---

## Suggested Sprint Plan

### Sprint 1: Foundation
- 1.1 Citation Cards Display
- 2.1 Responsive Layout

### Sprint 2: Mobile Core
- 2.2 iOS Safari WebRTC
- 2.3 PWA Installation

### Sprint 3: Visual Polish
- 1.2 Conversation Transcript
- 1.3 Visual Waveform
- 2.4 Touch-to-Talk
