import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../store/auth.js';

// Import layouts
import AdminLayout from '../layouts/AdminLayout.jsx';
import ClientLayout from '../layouts/ClientLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import MobileUserLayout from '../layouts/MobileUserLayout.jsx';
import SuperAdminLayout from '../layouts/SuperAdminLayout.jsx';

const routes = [
  {
    path: '/',
    redirect: '/user/login'
  },

  // Partner routes
  {
    path: '/partner/login',
    name: 'PartnerLogin',
    component: () => import('../views/partner/PartnerLogin.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/partner/register',
    name: 'PartnerRegister',
    component: () => import('../views/partner/PartnerRegister.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/partner/dashboard',
    name: 'PartnerDashboard',
    component: () => import('../views/partner/PartnerDashboard.jsx'),
    meta: { requiresAuth: true, requiresRole: 'partner' }
  },
  {
    path: '/partner/chat',
    name: 'PartnerChat',
    component: () => import('../views/partner/PartnerChat.jsx')
  },
  {
    path: '/partner/earnings',
    name: 'PartnerEarningsHistory',
    component: () => import('../views/partner/PartnerEarningsHistory.jsx'),
    meta: { requiresAuth: true, requiresRole: 'partner' }
  },

  // Auth routes - Super Admin
  {
    path: '/super-admin/login',
    name: 'SuperAdminLogin',
    component: () => import('../views/auth/SuperAdminLogin.jsx'),
    meta: { requiresGuest: true }
  },

  // Auth routes - Admin
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('../views/auth/AdminLogin.jsx'),
    meta: { requiresGuest: true }
  },

  // Auth routes - Client
  {
    path: '/client/login',
    name: 'ClientLogin',
    component: () => import('../views/auth/ClientLogin.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/client/register',
    name: 'ClientRegister',
    component: () => import('../views/auth/ClientRegister.jsx'),
    meta: { requiresGuest: true }
  },

  // Auth routes - User
  {
    path: '/user/login',
    name: 'UserLogin',
    component: () => import('../views/auth/UserLogin.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/user/register',
    name: 'UserRegister',
    component: () => import('../views/auth/UserRegister.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/user/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/auth/ForgotPassword.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/user/verify-reset-otp',
    name: 'VerifyResetOTP',
    component: () => import('../views/auth/VerifyResetOTP.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/user/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/auth/ResetPassword.jsx'),
    meta: { requiresGuest: true }
  },

  // Legacy auth routes (for backward compatibility)
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.jsx'),
    meta: { requiresGuest: true }
  },
  {
    path: '/user/verify-otp',
    name: 'VerifyResetOTPLegacy',
    component: () => import('../views/auth/VerifyResetOTP.jsx'),
    meta: { requiresGuest: true }
  },

  // Mobile User Registration (Multi-step with OTP)
  {
    path: '/mobile/user/register',
    name: 'MobileUserRegister',
    component: () => import('../views/mobile/MobileUserRegister.jsx'),
    meta: { requiresGuest: true }
  },

  // Mobile user routes
  {
    path: '/mobile/user',
    component: MobileUserLayout,
    meta: { requiresAuth: true, requiresRole: 'user' },
    redirect: '/mobile/user/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'MobileUserDashboard',
        component: () => import('../views/mobile/MobileUserDashboard.jsx')
      },
      {
        path: 'profile',
        name: 'MobileUserProfile',
        component: () => import('../views/mobile/MobileUserProfile.jsx')
      },
      {
        path: 'chat',
        name: 'MobileChatPage',
        component: () => import('../views/mobile/MobileChatPage.jsx')
      },
      {
        path: 'voice',
        name: 'MobileVoicePage',
        component: () => import('../views/mobile/MobileVoicePage.jsx')
      },


      {
        path: 'brahma-bazar',
        name: 'MobileBrahmaBazar',
        component: () => import('../views/mobile/MobileBrahmaBazar.jsx')
      },


      {
        path: 'utility',
        name: 'MobileUtility',
        component: () => import('../views/mobile/MobileUtility.jsx')
      },
      {
        path: 'coming-soon',
        name: 'ComingSoon',
        component: () => import('../views/mobile/ComingSoon.jsx')
      },

      {
        path: 'home',
        name: 'MobileHome',
        component: () => import('../views/mobile/Navigation/Home.jsx')
      },


      {
        path: 'connect',
        name: 'MobileConnect',
        component: () => import('../views/mobile/Navigation/Connect.jsx')
      },


      {
        path: 'user-chat',
        name: 'MobileUserChat',
        component: () => import('../views/mobile/UserChat.jsx')
      },

      {
        path: 'notifications',
        name: 'MobileNotifications',
        component: () => import('../views/mobile/MobileNotifications.jsx')
      },

    ]
  },

  // Super Admin routes
  {
    path: '/super-admin',
    component: SuperAdminLayout,
    meta: { requiresAuth: true, requiresRole: 'super_admin' },
    redirect: '/super-admin/overview',
    children: [
      {
        path: 'overview',
        name: 'SuperAdminOverview',
        component: () => import('../views/super-admin/Overview.jsx')
      },
      {
        path: 'profile',
        name: 'SuperAdminProfile',
        component: () => import('../views/super-admin/Profile.jsx')
      },
      {
        path: 'admins',
        name: 'SuperAdminAdmins',
        component: () => import('../views/super-admin/Admins.jsx')
      },
      {
        path: 'pending-approvals',
        name: 'SuperAdminPendingApprovals',
        component: () => import('../views/super-admin/PendingApprovals.jsx')
      },
      {
        path: 'users',
        name: 'SuperAdminUsers',
        component: () => import('../views/super-admin/Users.jsx')
      }
    ]
  },

  // Admin routes
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresRole: ['admin', 'super_admin'] },
    redirect: '/admin/overview',
    children: [
      {
        path: 'overview',
        name: 'AdminOverview',
        component: () => import('../views/admin/Overview.jsx')
      },
      {
        path: 'profile',
        name: 'AdminProfile',
        component: () => import('../views/admin/Profile.jsx')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/Users.jsx')
      },
      {
        path: 'clients',
        name: 'AdminClients',
        component: () => import('../views/admin/Clients.jsx')
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('../views/admin/Settings.jsx')
      },
      {
        path: 'prompts',
        name: 'AdminPrompts',
        component: () => import('../views/admin/Prompts.jsx')
      },
      {
        path: 'payments',
        name: 'AdminPayments',
        component: () => import('../views/admin/Payments.jsx')
      },
      {
        path: 'support',
        name: 'AdminSupport',
        component: () => import('../views/admin/Support.jsx')
      },
      {
        path: 'health',
        name: 'AdminHealth',
        component: () => import('../views/admin/Health.jsx')
      },
      {
        path: 'tools',
        name: 'AdminTools',
        component: () => import('../views/admin/Tools.jsx')
      },
      {
        path: 'ai-agents',
        name: 'AdminAIAgents',
        component: () => import('../views/admin/AIAgents.jsx')
      },

    ]
  },

  // Client routes
  {
    path: '/client',
    component: ClientLayout,
    meta: { requiresAuth: true, requiresRole: ['client', 'admin', 'super_admin'] },
    redirect: '/client/overview',
    children: [
      {
        path: 'overview',
        name: 'ClientOverview',
        component: () => import('../views/client/Overview.jsx')
      },
      {
        path: 'profile',
        name: 'ClientProfile',
        component: () => import('../views/client/Profile.jsx')
      },


      {
        path: 'users',
        name: 'ClientUsers',
        component: () => import('../views/client/Users.jsx')
      },


      {
        path: 'settings',
        name: 'ClientSettings',
        component: () => import('../views/client/Settings.jsx')
      },
      {
        path: 'payments',
        name: 'ClientPayments',
        component: () => import('../views/client/Payments.jsx')
      },
      {
        path: 'support',
        name: 'ClientSupport',
        component: () => import('../views/client/Support.jsx')
      },
      {
        path: 'health',
        name: 'ClientHealth',
        component: () => import('../views/client/Health.jsx')
      },

      {
        path: 'services',
        name: 'ClientServices',
        component: () => import('../views/client/Services.jsx')
      },
      {
        path: 'ai-agents',
        name: 'ClientAIAgents',
        component: () => import('../views/client/AIAgents.jsx')
      },

      {
        path: 'brahma-bazar',
        name: 'ClientBrahmaBazar',
        component: () => import('../views/client/services/BrahmaBazar.jsx')
      },
      {
        path: 'tools',
        name: 'ClientTools',
        component: () => import('../views/client/Tools.jsx')
      },
      // Client Tools

      {
        path: 'tools/branding',
        name: 'Branding',
        component: () => import('../views/client/tools/Branding.jsx')
      },
      {
        path: 'tools/founder-message',
        name: 'FounderMessage',
        component: () => import('../views/client/tools/FounderMessage.jsx')
      },
      {
        path: 'tools/testimonial',
        name: 'Testimonial',
        component: () => import('../views/client/tools/Testimonial.jsx')
      },
      {
        path: 'tools/sponsors',
        name: 'Sponsors',
        component: () => import('../views/client/tools/Sponsors.jsx')
      },
      {
        path: 'tools/rating',
        name: 'Rating',
        component: () => import('../views/client/tools/Rating.jsx')
      },
      {
        path: 'tools/survey',
        name: 'Survey',
        component: () => import('../views/client/tools/Survey.jsx')
      },
      {
        path: 'tools/tickets',
        name: 'Tickets',
        component: () => import('../views/client/tools/Tickets.jsx')
      },
      {
        path: 'tools/offers',
        name: 'Offers',
        component: () => import('../views/client/tools/Offers.jsx')
      },
      {
        path: 'tools/advertisement',
        name: 'Advertisement',
        component: () => import('../views/client/tools/Advertisement.jsx')
      },
      {
        path: 'tools/push-notification',
        name: 'PushNotification',
        component: () => import('../views/client/tools/PushNotification.jsx')
      },
      {
        path: 'tools/push-notification',
        name: 'PushNotification',
        component: () => import('../views/client/tools/PushNotification.jsx')
      },

      // Client Services


      // Client Services
      {
        path: 'services/brahma-bazar',
        name: 'BrahmaBazar',
        component: () => import('../views/client/services/BrahmaBazar.jsx')
      },

      // Client Activity

    ]
  },

  // User routes
  {
    path: '/user',
    component: DashboardLayout,
    meta: { requiresAuth: true, requiresRole: 'user' },
    redirect: '/user/overview',
    children: [
      {
        path: 'overview',
        name: 'UserOverview',
        component: () => import('../views/user/Overview.jsx')
      },
      {
        path: 'profile',
        name: 'UserProfile',
        component: () => import('../views/user/Profile.jsx')
      }
    ]
  },

  // Standalone pages
  {
    path: '/chat',
    name: 'ChatPage',
    component: () => import('../pages/ChatPage.jsx')
  },
  {
    path: '/voice',
    name: 'VoicePage',
    component: () => import('../pages/VoicePage.jsx')
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../pages/Home.jsx')
  },

  // 404 route
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.jsx')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Helper function to get role from path
const getRoleFromPath = (path) => {
  if (path.startsWith('/super-admin')) return 'super_admin';
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/client')) return 'client';
  if (path.startsWith('/partner')) return 'partner';
  if (path.startsWith('/mobile/user')) return 'user'; // Check mobile/user before /user
  if (path.startsWith('/user')) return 'user';
  return null;
};

// Helper function to get role from JWT token
const getRoleFromToken = (token) => {
  try {
    const tokenToCheck = token || localStorage.getItem('token_super_admin') ||
      localStorage.getItem('token_admin') ||
      localStorage.getItem('token_client') ||
      localStorage.getItem('token_user') ||
      localStorage.getItem('partner_token');
    if (tokenToCheck) {
      const tokenParts = tokenToCheck.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        return payload.role;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return null;
};

// Helper to check if a specific role is authenticated
const isRoleAuthenticated = (role) => {
  if (!role) return false;
  if (role === 'partner') {
    return !!localStorage.getItem('partner_token');
  }
  const token = localStorage.getItem(`token_${role}`);
  return !!token;
};

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const { initializeAuth, getCurrentRole, getTokenForRole } = useAuth();

  // Determine the role for the target route
  const targetRole = getRoleFromPath(to.path);

  // Handle token from query parameter (for admin login as client)
  if (to.query.token) {
    // Determine role from path or token itself
    const role = targetRole || getRoleFromToken(to.query.token);
    if (role) {
      localStorage.setItem(`token_${role}`, to.query.token);
    }
    // Remove token from URL and continue
    const { token, ...queryWithoutToken } = to.query;
    next({ path: to.path, query: queryWithoutToken, replace: true });
    return;
  }

  // Initialize auth state for the target role
  await initializeAuth(targetRole);

  // Check authentication for the specific role
  const isAuthForRole = targetRole ? isRoleAuthenticated(targetRole) : false;

  if (to.meta.requiresAuth && !isAuthForRole) {
    // Redirect to appropriate login page based on route
    if (to.path.startsWith('/super-admin')) {
      next('/super-admin/login');
    } else if (to.path.startsWith('/admin')) {
      next('/admin/login');
    } else if (to.path.startsWith('/client')) {
      next('/client/login');
    } else if (to.path.startsWith('/partner')) {
      next('/partner/login');
    } else {
      next('/user/login');
    }
  } else if (to.meta.requiresGuest && isAuthForRole) {
    // Redirect to appropriate dashboard based on role
    if (targetRole === 'super_admin') {
      next('/super-admin/overview');
    } else if (targetRole === 'admin') {
      next('/admin/overview');
    } else if (targetRole === 'client') {
      next('/client/overview');
    } else if (targetRole === 'partner') {
      next('/partner/dashboard');
    } else if (targetRole === 'user') {
      // Check if user is accessing web frontend or mobile
      // If coming from web routes, redirect to web dashboard
      if (from.path.startsWith('/user') && !from.path.startsWith('/mobile')) {
        next('/user/overview');
      } else {
        next('/mobile/user/dashboard'); // Default to mobile dashboard
      }
    } else {
      next('/dashboard');
    }
  } else if (to.meta.requiresRole) {
    const requiredRoles = Array.isArray(to.meta.requiresRole)
      ? to.meta.requiresRole
      : [to.meta.requiresRole];

    // Check if the target role is in the required roles and authenticated
    if (targetRole && requiredRoles.includes(targetRole) && isAuthForRole) {
      next();
    } else {
      // Redirect based on target role
      if (targetRole === 'super_admin') {
        next('/super-admin/login');
      } else if (targetRole === 'admin') {
        next('/admin/login');
      } else if (targetRole === 'client') {
        next('/client/login');
      } else if (targetRole === 'partner') {
        next('/partner/login');
      } else {
        next('/user/login');
      }
    }
  } else {
    next();
  }
});

export default router;