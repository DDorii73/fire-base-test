import './style.css'
import { auth, googleProvider } from './firebaseConfig.js'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

// 관리자 UID 확인 함수
function isAdmin(user) {
  // VITE_ADMIN_UIDS (복수형) 또는 VITE_ADMIN_UID (단수형) 지원
  const adminUids = import.meta.env.VITE_ADMIN_UIDS || import.meta.env.VITE_ADMIN_UID
  if (!adminUids) {
    console.warn('관리자 UID가 설정되지 않았습니다.')
    return false
  }
  
  // 쉼표로 구분된 여러 UID 지원 (단일 UID도 지원)
  const adminUidList = adminUids.split(',').map(uid => uid.trim()).filter(uid => uid.length > 0)
  const isAdminUser = user && adminUidList.includes(user.uid)
  
  if (import.meta.env.DEV) {
    console.log('관리자 권한 확인:', {
      '사용자 UID': user?.uid,
      '관리자 UID 목록': adminUidList,
      '관리자 여부': isAdminUser
    })
  }
  
  return isAdminUser
}

// UI 요소
const loginScreen = document.getElementById('loginScreen')
const mainScreen = document.getElementById('mainScreen')
const googleLoginBtn = document.getElementById('googleLoginBtn')
const logoutBtn = document.getElementById('logoutBtn')
const userInfo = document.getElementById('userInfo')
const studentBtn = document.getElementById('studentBtn')
const teacherBtn = document.getElementById('teacherBtn')

// Google 로그인 함수
async function handleGoogleLogin() {
  try {
    googleLoginBtn.disabled = true
    googleLoginBtn.textContent = '로그인 중...'
    
    const result = await signInWithPopup(auth, googleProvider)
    console.log('로그인 성공:', result.user)
  } catch (error) {
    console.error('로그인 오류:', error)
    alert(`로그인에 실패했습니다: ${error.message}`)
    googleLoginBtn.disabled = false
    googleLoginBtn.innerHTML = '<span class="google-icon">🔐</span> Google로 로그인'
  }
}

// 로그아웃 함수
async function handleLogout() {
  try {
    // 확인 메시지
    const confirmLogout = confirm('로그아웃하시겠습니까? 다른 계정으로 로그인할 수 있습니다.')
    if (!confirmLogout) {
      return
    }
    
    await signOut(auth)
    console.log('로그아웃 성공')
    
    // 로그아웃 후 로그인 화면으로 전환 (onAuthStateChanged에서 자동 처리됨)
  } catch (error) {
    console.error('로그아웃 오류:', error)
    alert(`로그아웃에 실패했습니다: ${error.message}`)
  }
}

// 사용자 정보 표시 함수
function displayUserInfo(user) {
  userInfo.innerHTML = `
    <div class="user-profile">
      <img src="${user.photoURL || ''}" alt="프로필" class="user-avatar" onerror="this.style.display='none'">
      <div class="user-details">
        <p class="user-name">${user.displayName || '사용자'}</p>
        <p class="user-email">${user.email || ''}</p>
      </div>
    </div>
  `
}

// 화면 전환 함수
function showLoginScreen() {
  loginScreen.style.display = 'block'
  mainScreen.style.display = 'none'
}

function showMainScreen(user) {
  loginScreen.style.display = 'none'
  mainScreen.style.display = 'block'
  if (user) {
    displayUserInfo(user)
    // 관리자 권한 확인 후 교사 모니터링 버튼 표시/숨김
    if (isAdmin(user)) {
      teacherBtn.style.display = 'block'
    } else {
      teacherBtn.style.display = 'none'
    }
  }
}

// 인증 상태 변경 감지
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 로그인된 상태
    showMainScreen(user)
    googleLoginBtn.disabled = false
    googleLoginBtn.innerHTML = '<span class="google-icon">🔐</span> Google로 로그인'
  } else {
    // 로그아웃된 상태
    showLoginScreen()
  }
})

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  // Google 로그인 버튼 클릭
  googleLoginBtn.addEventListener('click', handleGoogleLogin)

  // 로그아웃 버튼 클릭
  logoutBtn.addEventListener('click', handleLogout)

  // 학생 활동 페이지로 이동
  if (studentBtn) {
    studentBtn.addEventListener('click', () => {
      window.location.href = 'student.html'
    })
  }

  // 교사 모니터링 페이지로 이동
  if (teacherBtn) {
    teacherBtn.addEventListener('click', () => {
      window.location.href = 'teacherMonitor.html'
    })
  }
})
