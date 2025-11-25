import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// 환경 변수에서 Firebase 설정값 불러오기
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // measurementId는 Analytics 사용 시에만 필요 (선택사항)
  ...(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID && {
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  })
}

// 환경 변수 확인 (개발 모드에서만)
if (import.meta.env.DEV) {
  console.log('=== Firebase 환경 변수 확인 ===')
  console.log('API Key:', firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 20)}...` : '❌ 없음')
  console.log('Auth Domain:', firebaseConfig.authDomain || '❌ 없음')
  console.log('Project ID:', firebaseConfig.projectId || '❌ 없음')
  console.log('Storage Bucket:', firebaseConfig.storageBucket || '❌ 없음')
  console.log('Messaging Sender ID:', firebaseConfig.messagingSenderId || '❌ 없음')
  console.log('App ID:', firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 20)}...` : '❌ 없음')
  console.log('============================')
}

// 필수 값 확인
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId']
const missingFields = requiredFields.filter(field => !firebaseConfig[field])

if (missingFields.length > 0) {
  console.error('❌ Firebase 필수 설정값이 누락되었습니다:', missingFields)
  throw new Error(`Firebase 설정 오류: ${missingFields.join(', ')} 필드가 필요합니다.`)
}

// Firebase 초기화
let app
try {
  app = initializeApp(firebaseConfig)
  console.log('✅ Firebase 초기화 성공')
} catch (error) {
  console.error('❌ Firebase 초기화 실패:', error)
  throw error
}

// Auth 인스턴스 생성
export const auth = getAuth(app)

// Google Auth Provider 설정
export const googleProvider = new GoogleAuthProvider()
// 항상 계정 선택 화면 표시 (다른 계정으로 로그인 가능하도록)
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

// Firestore 인스턴스 생성
export const db = getFirestore(app)

// Storage 인스턴스 생성
export const storage = getStorage(app)

export default app

