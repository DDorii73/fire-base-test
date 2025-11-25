import './style.css'
import { auth, db, storage } from './firebaseConfig.js'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { ref, getDownloadURL } from 'firebase/storage'

// 관리자 UID 확인 함수
function isAdmin(user) {
  const adminUids = import.meta.env.VITE_ADMIN_UIDS || import.meta.env.VITE_ADMIN_UID
  if (!adminUids) {
    console.warn('관리자 UID가 설정되지 않았습니다.')
    return false
  }
  
  const adminUidList = adminUids.split(',').map(uid => uid.trim()).filter(uid => uid.length > 0)
  const isAdminUser = user && adminUidList.includes(user.uid)
  
  console.log('관리자 권한 확인:', {
    '사용자 UID': user?.uid,
    '관리자 UID 목록': adminUidList,
    '관리자 여부': isAdminUser
  })
  
  return isAdminUser
}

// 상태 관리
let allActivities = []
let selectedDates = new Set()
let selectedActivity = null

// Firestore에서 모든 활동 데이터 가져오기
async function loadAllActivities() {
  try {
    const activitiesRef = collection(db, 'studentActivities')
    const q = query(activitiesRef, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    allActivities = []
    querySnapshot.forEach((docSnapshot) => {
      allActivities.push({
        id: docSnapshot.id,
        ...docSnapshot.data()
      })
    })
    
    console.log('활동 데이터 로드 완료:', allActivities.length, '개')
    return allActivities
  } catch (error) {
    console.error('데이터 로드 오류:', error)
    alert(`데이터를 불러오는데 실패했습니다: ${error.message}`)
    return []
  }
}

// 날짜 목록 추출 및 표시
function displayDateFilter() {
  const dateSet = new Set()
  allActivities.forEach(activity => {
    if (activity.activityDate) {
      dateSet.add(activity.activityDate)
    }
  })
  
  const sortedDates = Array.from(dateSet).sort().reverse() // 최신 날짜부터
  const dateFilterList = document.getElementById('dateFilterList')
  
  if (sortedDates.length === 0) {
    dateFilterList.innerHTML = '<p class="empty-text">데이터가 없습니다</p>'
    return
  }
  
  dateFilterList.innerHTML = sortedDates.map(date => {
    const isChecked = selectedDates.has(date)
    return `
      <label class="date-checkbox">
        <input type="checkbox" value="${date}" ${isChecked ? 'checked' : ''}>
        <span>${formatDate(date)}</span>
      </label>
    `
  }).join('')
  
  // 체크박스 이벤트 리스너 추가
  dateFilterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const date = e.target.value
      if (e.target.checked) {
        selectedDates.add(date)
      } else {
        selectedDates.delete(date)
      }
      displayUserList()
    })
  })
}

// 날짜 포맷팅 (YYYY-MM-DD -> YYYY년 MM월 DD일)
function formatDate(dateString) {
  const [year, month, day] = dateString.split('-')
  return `${year}년 ${month}월 ${day}일`
}

// 선택된 날짜의 사용자 목록 표시
function displayUserList() {
  const userList = document.getElementById('userList')
  
  if (selectedDates.size === 0) {
    userList.innerHTML = '<p class="empty-text">날짜를 선택해주세요</p>'
    return
  }
  
  // 선택된 날짜의 활동 필터링
  const filteredActivities = allActivities.filter(activity => 
    selectedDates.has(activity.activityDate)
  )
  
  if (filteredActivities.length === 0) {
    userList.innerHTML = '<p class="empty-text">선택한 날짜에 데이터가 없습니다</p>'
    return
  }
  
  // 시간순으로 정렬 (최신순)
  filteredActivities.sort((a, b) => {
    const timeA = a.activityTime || ''
    const timeB = b.activityTime || ''
    return timeB.localeCompare(timeA)
  })
  
  userList.innerHTML = filteredActivities.map(activity => {
    const displayName = activity.userName || '이름 없음'
    const date = formatDate(activity.activityDate)
    const time = activity.activityTime || '시간 없음'
    
    return `
      <div class="user-item ${selectedActivity?.id === activity.id ? 'active' : ''}" 
           data-activity-id="${activity.id}">
        <div class="user-item-content">
          <span class="user-name">${displayName}</span>
          <span class="user-date-time">${date} ${time}</span>
        </div>
      </div>
    `
  }).join('')
  
  // 사용자 아이템 클릭 이벤트
  userList.querySelectorAll('.user-item').forEach(item => {
    item.addEventListener('click', () => {
      const activityId = item.dataset.activityId
      const activity = filteredActivities.find(a => a.id === activityId)
      if (activity) {
        selectActivity(activity)
        // 활성화 상태 업데이트
        userList.querySelectorAll('.user-item').forEach(i => i.classList.remove('active'))
        item.classList.add('active')
      }
    })
  })
}

// 활동 선택 및 상세 정보 표시
async function selectActivity(activity) {
  selectedActivity = activity
  
  // 대화 내용 표시
  displayConversation(activity)
  
  // 그림 표시
  await displayDrawing(activity)
  
  // 삭제 버튼 표시
  displayDeleteButton(activity)
}

// 대화 내용 표시
function displayConversation(activity) {
  const conversationContent = document.getElementById('conversationContent')
  
  if (!activity.conversationHistory || activity.conversationHistory.length === 0) {
    conversationContent.innerHTML = '<div class="empty-state"><p>대화 내용이 없습니다</p></div>'
    return
  }
  
  // 사용자 정보 표시
  const userInfo = `
    <div class="activity-info">
      <h3>${activity.userName || '이름 없음'}</h3>
      <p class="activity-meta">
        ${formatDate(activity.activityDate)} ${activity.activityTime || ''} | 
        대화 시간: ${formatDuration(activity.chatDuration)} | 
        그림 시간: ${formatDuration(activity.drawingDuration)}
      </p>
    </div>
  `
  
  // 대화 내용 표시
  const conversationHtml = activity.conversationHistory.map(msg => {
    const isBot = msg.type === 'bot'
    return `
      <div class="conversation-message ${isBot ? 'bot-message' : 'user-message'}">
        <div class="message-label">${isBot ? '🤖 챗봇' : '👤 사용자'}</div>
        <div class="message-text">${escapeHtml(msg.content)}</div>
      </div>
    `
  }).join('')
  
  conversationContent.innerHTML = userInfo + '<div class="conversation-list">' + conversationHtml + '</div>'
}

// 그림 표시
async function displayDrawing(activity) {
  const drawingContent = document.getElementById('drawingContent')
  
  if (!activity.imageUrl) {
    drawingContent.innerHTML = '<div class="empty-state"><p>그림이 없습니다</p></div>'
    return
  }
  
  try {
    // Storage에서 이미지 URL 가져오기
    let imageUrl = activity.imageUrl
    
    // gs:// 형식인 경우 다운로드 URL로 변환
    if (imageUrl.startsWith('gs://')) {
      const pathParts = imageUrl.replace('gs://', '').split('/')
      const bucket = pathParts[0]
      const filePath = pathParts.slice(1).join('/')
      const storageRef = ref(storage, filePath)
      imageUrl = await getDownloadURL(storageRef)
    }
    
    drawingContent.innerHTML = `
      <div class="drawing-image-container">
        <img src="${imageUrl}" alt="학생 그림" class="drawing-image" onerror="this.parentElement.innerHTML='<p class=\\'error-text\\'>이미지를 불러올 수 없습니다</p>'">
      </div>
    `
  } catch (error) {
    console.error('이미지 로드 오류:', error)
    drawingContent.innerHTML = '<div class="empty-state"><p class="error-text">이미지를 불러올 수 없습니다</p></div>'
  }
}

// 삭제 버튼 표시
function displayDeleteButton(activity) {
  // 기존 삭제 버튼 제거
  const existingDeleteBtn = document.querySelector('.delete-activity-btn')
  if (existingDeleteBtn) {
    existingDeleteBtn.remove()
  }
  
  // 새 삭제 버튼 추가
  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'delete-activity-btn'
  deleteBtn.textContent = '🗑️ 데이터 삭제'
  deleteBtn.addEventListener('click', () => deleteActivity(activity))
  
  const conversationContent = document.getElementById('conversationContent')
  conversationContent.appendChild(deleteBtn)
}

// 활동 삭제
async function deleteActivity(activity) {
  const confirmDelete = confirm(`정말로 "${activity.userName}"님의 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)
  
  if (!confirmDelete) {
    return
  }
  
  try {
    await deleteDoc(doc(db, 'studentActivities', activity.id))
    console.log('데이터 삭제 완료:', activity.id)
    
    // 목록에서 제거
    allActivities = allActivities.filter(a => a.id !== activity.id)
    
    // UI 업데이트
    displayDateFilter()
    displayUserList()
    
    // 선택된 활동 초기화
    selectedActivity = null
    document.getElementById('conversationContent').innerHTML = '<div class="empty-state"><p>👈 좌측에서 학생을 선택해주세요</p></div>'
    document.getElementById('drawingContent').innerHTML = '<div class="empty-state"><p>👈 좌측에서 학생을 선택해주세요</p></div>'
    
    alert('데이터가 삭제되었습니다.')
  } catch (error) {
    console.error('삭제 오류:', error)
    alert(`데이터 삭제에 실패했습니다: ${error.message}`)
  }
}

// 시간 포맷팅 (초 -> 분:초)
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '0초'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}분 ${secs}초`
  }
  return `${secs}초`
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 교사 모니터링 페이지 초기화
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert('로그인이 필요합니다.')
      window.location.href = 'index.html'
      return
    }
    
    if (!isAdmin(user)) {
      alert('접근 권한이 없습니다. 관리자만 접근할 수 있습니다.')
      window.location.href = 'index.html'
      return
    }
    
    console.log('교사 모니터링 페이지가 로드되었습니다.')
    console.log('관리자:', user.displayName, user.email)
    
    // 데이터 로드 및 초기화
    await loadAllActivities()
    displayDateFilter()
  })
})
