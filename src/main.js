import './style.css'
import { auth, db, storage } from './firebaseConfig.js'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc } from 'firebase/firestore'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'

// 상태 관리
let chatHistory = []
let conversationHistory = [] // 화면에 표시된 대화 내역 (사용자/봇 구분)
let turnCount = 0
let isDrawing = false
let canvas = null
let ctx = null
let currentUser = null

// 시간 추적
let chatStartTime = null // 첫 대화 전송 시간
let chatEndTime = null // 대화 끝내기 버튼 클릭 시간
let drawingStartTime = null // 그림 그리기 화면 전환 시간

// ChatGPT API 호출 함수
async function callChatGPTAPI(userMessage) {
  const apiKey = import.meta.env.VITE_CHATGPT_API_KEY
  
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('ChatGPT API Key가 설정되지 않았습니다. .env 파일에 VITE_CHATGPT_API_KEY=your_api_key 형식으로 설정하고 개발 서버를 재시작해주세요.')
  }

  // 대화 히스토리에 사용자 메시지 추가
  chatHistory.push({
    role: 'user',
    content: userMessage
  })

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '당신은 중고등학생들의 사회정서학습을 돕는 따뜻하고 친근한 상담 챗봇입니다. 학생들이 오늘 하루 학교에서의 경험과 감정을 편안하게 나눌 수 있도록 도와주세요. 3~7회의 대화로 자연스럽게 대화를 이끌어가세요.'
          },
          ...chatHistory
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'API 호출에 실패했습니다.')
    }

    const data = await response.json()
    const botMessage = data.choices[0].message.content

    // 대화 히스토리에 봇 응답 추가
    chatHistory.push({
      role: 'assistant',
      content: botMessage
    })

    return botMessage
  } catch (error) {
    console.error('ChatGPT API 오류:', error)
    throw error
  }
}

// 메시지 표시 함수
function addMessage(content, isBot = true) {
  const chatMessages = document.getElementById('chatMessages')
  const messageDiv = document.createElement('div')
  messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`
  
  const contentDiv = document.createElement('div')
  contentDiv.className = 'message-content'
  contentDiv.textContent = content
  
  messageDiv.appendChild(contentDiv)
  chatMessages.appendChild(messageDiv)
  
  // 대화 내역 저장 (화면 표시용)
  conversationHistory.push({
    type: isBot ? 'bot' : 'user',
    content: content,
    timestamp: new Date()
  })
  
  // 스크롤을 맨 아래로
  chatMessages.scrollTop = chatMessages.scrollHeight
}

// 대화 횟수 업데이트
function updateTurnCount() {
  const turnCountElement = document.getElementById('turnCount')
  turnCountElement.textContent = `대화 횟수: ${turnCount}회`
  
  // 3회 이상이면 "대화 끝내기" 버튼 표시
  const endChatBtn = document.getElementById('endChatBtn')
  if (turnCount >= 3) {
    endChatBtn.style.display = 'block'
  }
}

// 사용자 정보 표시
function displayUserInfo(user) {
  const userInfoBar = document.getElementById('userInfoBar')
  const userNameDisplay = document.getElementById('userNameDisplay')
  const userEmailDisplay = document.getElementById('userEmailDisplay')
  
  if (user && userInfoBar && userNameDisplay && userEmailDisplay) {
    userNameDisplay.textContent = user.displayName || '사용자'
    userEmailDisplay.textContent = user.email || ''
    userInfoBar.style.display = 'block'
    currentUser = user
  }
}

// 그림 그리기 초기화
function initDrawingCanvas() {
  canvas = document.getElementById('drawingCanvas')
  ctx = canvas.getContext('2d')
  
  // 캔버스 크기 설정
  const container = canvas.parentElement
  const maxWidth = Math.min(800, window.innerWidth - 100)
  const maxHeight = Math.min(600, window.innerHeight - 300)
  
  canvas.width = maxWidth
  canvas.height = maxHeight
  
  // 하얀 배경 설정
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // 검정색 펜 설정
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  // 마우스 이벤트
  let isDrawingNow = false
  let lastX = 0
  let lastY = 0
  
  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }
  
  function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0] || e.changedTouches[0]
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  }
  
  function startDrawing(e) {
    isDrawingNow = true
    const pos = e.touches ? getTouchPos(e) : getMousePos(e)
    lastX = pos.x
    lastY = pos.y
  }
  
  function draw(e) {
    if (!isDrawingNow) return
    
    e.preventDefault()
    const pos = e.touches ? getTouchPos(e) : getMousePos(e)
    
    ctx.beginPath()
    ctx.moveTo(lastX, lastY)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    
    lastX = pos.x
    lastY = pos.y
  }
  
  function stopDrawing() {
    isDrawingNow = false
  }
  
  // 마우스 이벤트
  canvas.addEventListener('mousedown', startDrawing)
  canvas.addEventListener('mousemove', draw)
  canvas.addEventListener('mouseup', stopDrawing)
  canvas.addEventListener('mouseleave', stopDrawing)
  
  // 터치 이벤트 (모바일 지원)
  canvas.addEventListener('touchstart', startDrawing)
  canvas.addEventListener('touchmove', draw)
  canvas.addEventListener('touchend', stopDrawing)
  
  // 지우기 버튼
  document.getElementById('clearBtn').addEventListener('click', () => {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  })
  
  // 제출 버튼
  document.getElementById('submitBtn').addEventListener('click', async () => {
    await submitDrawing()
  })
}

// 그림 제출 함수
async function submitDrawing() {
  if (!currentUser) {
    alert('로그인이 필요합니다.')
    window.location.href = 'index.html'
    return
  }

  const submitBtn = document.getElementById('submitBtn')
  submitBtn.disabled = true
  submitBtn.textContent = '제출 중...'

  try {
    // 그림을 jpg 포맷으로 변환
    const imageData = canvas.toDataURL('image/jpeg', 0.9)
    
    // 현재 시간 기록
    const drawingEndTime = new Date()
    const now = new Date()
    
    // 시간 계산 (밀리초 단위)
    const chatDuration = chatEndTime && chatStartTime 
      ? Math.floor((chatEndTime - chatStartTime) / 1000) // 초 단위
      : 0
    
    const drawingDuration = drawingStartTime 
      ? Math.floor((drawingEndTime - drawingStartTime) / 1000) // 초 단위
      : 0
    
    // 날짜와 시간 추출 (시, 분까지만)
    const date = now.toISOString().split('T')[0] // YYYY-MM-DD
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` // HH:MM
    
    // Storage에 그림 저장
    const timestamp = Date.now()
    const fileName = `drawings/${currentUser.uid}/${timestamp}.jpg`
    const storageRef = ref(storage, fileName)
    
    await uploadString(storageRef, imageData, 'data_url')
    const imageUrl = await getDownloadURL(storageRef)
    
    // Firestore에 데이터 저장
    const activityData = {
      userName: currentUser.displayName || '사용자',
      userEmail: currentUser.email || '',
      chatDuration: chatDuration, // 초 단위
      drawingDuration: drawingDuration, // 초 단위
      conversationHistory: conversationHistory.map(msg => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      })),
      activityDate: date, // YYYY-MM-DD
      activityTime: time, // HH:MM
      imageUrl: imageUrl,
      createdAt: now.toISOString(),
      userId: currentUser.uid
    }
    
    await addDoc(collection(db, 'studentActivities'), activityData)
    
    alert('제출이 완료되었습니다! 감사합니다. 😊')
    
    // 메인 페이지로 이동
    setTimeout(() => {
      window.location.href = 'index.html'
    }, 1000)
    
  } catch (error) {
    console.error('제출 오류:', error)
    alert(`제출에 실패했습니다: ${error.message}`)
    submitBtn.disabled = false
    submitBtn.textContent = '제출하기'
  }
}

// 화면 전환 함수
function switchToDrawingScreen() {
  chatEndTime = new Date()
  drawingStartTime = new Date()
  
  document.getElementById('chatbotScreen').style.display = 'none'
  document.getElementById('drawingScreen').style.display = 'block'
  initDrawingCanvas()
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  // Firebase Auth 상태 확인
  onAuthStateChanged(auth, (user) => {
    if (user) {
      displayUserInfo(user)
    } else {
      // 로그인되지 않은 경우 메인 페이지로 이동
      alert('로그인이 필요합니다.')
      window.location.href = 'index.html'
    }
  })
  
  const userInput = document.getElementById('userInput')
  const sendBtn = document.getElementById('sendBtn')
  const endChatBtn = document.getElementById('endChatBtn')
  
  // 전송 버튼 클릭
  sendBtn.addEventListener('click', async () => {
    const message = userInput.value.trim()
    if (!message) return
    
    // 첫 대화인 경우 시작 시간 기록
    if (turnCount === 0) {
      chatStartTime = new Date()
    }
    
    // 사용자 메시지 표시
    addMessage(message, false)
    userInput.value = ''
    sendBtn.disabled = true
    sendBtn.textContent = '전송 중...'
    
    try {
      // ChatGPT API 호출
      const botResponse = await callChatGPTAPI(message)
      addMessage(botResponse, true)
      
      // 대화 횟수 증가
      turnCount++
      updateTurnCount()
      
      // 7회 이상이면 자동으로 그림 그리기 화면으로 전환
      if (turnCount >= 7) {
        setTimeout(() => {
          switchToDrawingScreen()
        }, 1000)
      }
    } catch (error) {
      addMessage(`죄송합니다. 오류가 발생했습니다: ${error.message}`, true)
      console.error(error)
    } finally {
      sendBtn.disabled = false
      sendBtn.textContent = '전송'
    }
  })
  
  // Enter 키로 전송
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !sendBtn.disabled) {
      sendBtn.click()
    }
  })
  
  // 대화 끝내기 버튼
  endChatBtn.addEventListener('click', () => {
    if (confirm('대화를 마치고 그림 그리기로 넘어가시겠습니까?')) {
      switchToDrawingScreen()
    }
  })
  
  // 초기 대화 횟수 표시
  updateTurnCount()
})
