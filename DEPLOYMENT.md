# 배포 가이드 (Netlify)

## 배포 전 확인 사항

### 1. 환경 변수 설정 (필수)

Netlify 대시보드에서 다음 환경 변수를 설정해야 합니다:

**Site settings > Environment variables**에서 추가:

```
VITE_CHATGPT_API_KEY=your_chatgpt_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ADMIN_UID=your_admin_uid
```

### 2. Firebase 설정 (필수)

Firebase 콘솔에서 다음 설정을 확인하세요:

1. **Authentication > Settings > Authorized domains**
   - Netlify 도메인 추가 (예: `your-site.netlify.app`)
   - 커스텀 도메인 사용 시 해당 도메인도 추가

2. **Firestore Database > Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /studentActivities/{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Storage > Rules**
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /drawings/{userId}/{allPaths=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

### 3. 빌드 설정 확인

Netlify 대시보드에서:
- **Build command**: `npm run build` (자동 감지됨)
- **Publish directory**: `dist` (자동 감지됨)

### 4. 일반적인 오류 해결

#### 오류: "환경 변수를 찾을 수 없습니다"
- Netlify 대시보드에서 환경 변수가 제대로 설정되었는지 확인
- 변수명이 `VITE_`로 시작하는지 확인
- 빌드 후 재배포 필요

#### 오류: "Firebase 초기화 실패"
- Firebase 설정값이 올바른지 확인
- Firebase 콘솔에서 프로젝트 설정 확인

#### 오류: "로그인 실패" 또는 "권한 오류"
- Firebase Authentication에서 승인된 도메인 확인
- Firestore/Storage 보안 규칙 확인

#### 오류: "페이지를 찾을 수 없습니다 (404)"
- `netlify.toml` 파일이 제대로 배포되었는지 확인
- `public/_redirects` 파일이 빌드에 포함되었는지 확인

### 5. 배포 후 테스트

1. 메인 페이지 접속 확인
2. Google 로그인 테스트
3. 학생 활동 페이지 접속 테스트
4. 교사 모니터링 페이지 접속 테스트 (관리자 계정)
5. 브라우저 콘솔에서 오류 확인 (F12)

### 6. 디버깅 팁

- Netlify Functions 로그 확인: **Functions > Logs**
- 빌드 로그 확인: **Deploys > [최신 배포] > Build log**
- 브라우저 콘솔 확인: 개발자 도구(F12) > Console

## 문제 해결

문제가 계속되면:
1. Netlify 빌드 로그 확인
2. 브라우저 콘솔 오류 확인
3. Firebase 콘솔에서 오류 로그 확인
4. 환경 변수 재설정 후 재배포

