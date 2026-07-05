const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../db.json');
if (!fs.existsSync(dbPath)) {
  console.error('db.json not found');
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 1. courses 추가
const courseSlug = 'glm52-video-course';
const courseId = 'glm52-video-course-id';
let courseIndex = db.courses.findIndex(c => c.slug === courseSlug);
const courseData = {
  id: courseId,
  slug: courseSlug,
  title: 'GLM-5.2 분석 강좌',
  description: '최근 핫한 오픈 가중치 LLM 모델인 GLM-5.2의 스펙과 Claude Code, Codex와의 연동법을 알아봅니다.',
  thumbnail: 'icon:video',
  tags: ['GLM-5.2', 'LLM', 'AI', '유튜브'],
  published: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  agent_id: null
};

if (courseIndex !== -1) {
  db.courses[courseIndex] = { ...db.courses[courseIndex], ...courseData };
  console.log('Course updated:', courseSlug);
} else {
  db.courses.push(courseData);
  console.log('Course added:', courseSlug);
}

// 2. course_packages 추가
const packageSlug = 'glm52-video-package';
const packageId = 'glm52-video-package-id';
let packageIndex = db.course_packages.findIndex(p => p.slug === packageSlug);
const packageData = {
  id: packageId,
  slug: packageSlug,
  title: 'GLM-5.2 기술 및 실무 분석',
  description: 'GLM-5.2 모델 분석 및 Claude Code 연동 실무 강좌 패키지입니다.',
  thumbnail: 'icon:video',
  published: true,
  sequential_play: false,
  force_checkpoint: false,
  version: '1.0.0',
  changelog: '최초 릴리즈',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  agent_id: null
};

if (packageIndex !== -1) {
  db.course_packages[packageIndex] = { ...db.course_packages[packageIndex], ...packageData };
  console.log('Package updated:', packageSlug);
} else {
  db.course_packages.push(packageData);
  console.log('Package added:', packageSlug);
}

// 3. course_package_items 매핑 추가
const packageItem = db.course_package_items.find(item => item.package_id === packageId && item.course_id === courseId);
if (!packageItem) {
  db.course_package_items.push({
    id: 'glm52-package-item-id',
    package_id: packageId,
    course_id: courseId,
    order_index: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  console.log('Package item mapping added');
} else {
  console.log('Package item mapping already exists');
}

// 4. user_package_subscriptions 구독 추가
const subscription = db.user_package_subscriptions.find(sub => sub.user_id === 'local-user-id' && sub.package_id === packageId);
if (!subscription) {
  db.user_package_subscriptions.push({
    id: 'glm52-subscription-id',
    user_id: 'local-user-id',
    package_id: packageId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  console.log('User package subscription added');
} else {
  console.log('User package subscription already exists');
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Successfully updated db.json');
