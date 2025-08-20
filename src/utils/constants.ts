/**
 * 애플리케이션 상수 정의
 */

export const CREDIT_PACKAGES: import('../types').CreditPackage[] = [
  {
    id: 'basic',
    credits: 10,
    price: 5900,
    originalPrice: 7900,
  },
  {
    id: 'popular',
    credits: 30,
    price: 14900,
    originalPrice: 23700,
    isPopular: true,
    badge: '가장 인기!',
  },
  {
    id: 'premium',
    credits: 50,
    price: 22900,
    originalPrice: 39500,
    badge: '최고 할인!',
  },
];

export const NAVIGATION_ITEMS = [
  { label: '홈', href: '/', icon: 'Home' },
  { label: '사용법', href: '/guide', icon: 'HelpCircle' },
  { label: '크레딧 충전', href: '/credits', icon: 'CreditCard' },
  { label: 'FAQ', href: '/faq', icon: 'MessageCircle' },
  { label: '고객센터', href: '/support', icon: 'Phone' },
] as const;

export const EXAMPLE_SWAPS = [
  {
    id: 1,
    before: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    after: 'https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 2,
    before: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400',
    after: 'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 3,
    before: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400',
    after: 'https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

export const SWAP_MODES: import('../types').SwapModeOption[] = [
  {
    id: 'single',
    title: '단일 얼굴 바꾸기',
    description: '한 장의 사진에서 한 명의 얼굴을 바꿔보세요',
    icon: 'User',
    creditCost: 1,
    features: ['빠른 처리 속도', '고품질 결과', '자연스러운 합성'],
  },
  {
    id: 'multi',
    title: '다중 얼굴 바꾸기',
    description: '한 장의 사진에서 여러 명의 얼굴을 동시에 바꿔보세요',
    icon: 'Users',
    creditCost: 3,
    features: ['최대 10명까지', '개별 얼굴 선택', '그룹 사진 최적화'],
    isPopular: true,
  },
  {
    id: 'video',
    title: '비디오 얼굴 바꾸기',
    description: '동영상에서 얼굴을 바꿔 더욱 재미있는 콘텐츠를 만들어보세요',
    icon: 'Video',
    creditCost: 5,
    features: ['최대 30초', 'HD 품질', '프레임별 최적화'],
  },
];

export const VIDEO_TEMPLATES = [
  {
    id: 'dance',
    title: '댄스 챌린지',
    thumbnail: 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: 15,
  },
  {
    id: 'speech',
    title: '연설하기',
    thumbnail: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: 20,
  },
  {
    id: 'interview',
    title: '인터뷰 장면',
    thumbnail: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400',
    duration: 25,
  },
];