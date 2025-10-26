import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import Brand from "@/components/Brand.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import NotificationCenter from "@/components/NotificationCenter.jsx";

export default function DashboardHeader({ variant = "user" }) {
  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout;
  const switchRole = auth?.switchRole;
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef(null);

  // Get available roles for this user
  const currentRole = user?.profile?.role || "goal_setter";
  
  // Show switchable roles (goal_setter and buyer) if user is not admin
  // This shows all available roles to switch to, not just the ones they currently have
  const roles = currentRole === "admin" ? [] : ["goal_setter", "buyer"];
  const hasMultipleRoles = roles.length > 1;

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    const pageMap = {
      "/dashboard": "Overview",
      "/goals": "My Goals",
      "/marketplace": "Marketplace",
      "/wishlist": "My Wishlist",
      "/finances": "My Finances",
      "/analytics": "Analytics",
      "/connection-requests": "Connection Requests",
      "/find-buyers": "Find Buyers",
      "/profile": "Profile",
      "/admin-dashboard": "Admin Overview",
      "/buyer-dashboard": "Dashboard",
      "/buyer-marketplace": "Browse Items",
      "/cart": "Shopping Cart",
      "/checkout": "Checkout",
      "/orders": "My Orders",
      "/find-goal-setters": "Find Goal Setters",
      "/buyer-profile": "Profile"
    };
    return pageMap[path] || "Dashboard";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

  // Role metadata for display and warnings
  const roleInfo = {
    goal_setter: {
      label: "Goal Setter",
      badge: "bg-primary",
      features: [
        "Create and manage savings goals",
        "Track financial progress",
        "Connect with buyers",
        "Access analytics"
      ],
      description: "Manage your financial goals and savings"
    },
    buyer: {
      label: "Buyer",
      badge: "bg-success",
      features: [
        "Browse goal-linked items",
        "Make purchases for goal setters",
        "Manage shopping cart",
        "Track orders"
      ],
      description: "Purchase items to support goal setters"
    },
    admin: {
      label: "Admin",
      badge: "bg-danger",
      features: [
        "Manage all users",
        "View system analytics",
        "Control marketplace",
        "Access financial reports"
      ],
      description: "System administration and oversight"
    }
  };

  const getRoleLabel = (role) => roleInfo[role]?.label || role.replace('_', ' ');
  const getRoleBadgeClass = (role) => roleInfo[role]?.badge || "bg-secondary";

  const handleRoleChange = async (newRole) => {
    if (newRole === currentRole) {
      setShowUserMenu(false);
      return;
    }
    
    setShowUserMenu(false);
    
    // Switch role directly without confirmation
    const result = await switchRole(newRole);
    if (result.ok) {
      // Navigate to appropriate dashboard based on new role
      const dashboardMap = {
        admin: "/admin-dashboard",
        buyer: "/buyer-dashboard",
        goal_setter: "/dashboard"
      };
      navigate(dashboardMap[newRole] || "/dashboard");
    }
  };

  return (
    <>
      <header className="site-header is-scrolled">
        <div className="container-xxl">
          <div className="header-content">
            <div className="header-brand d-flex align-items-center gap-2">
              <Brand />
            </div>

            <div className="page-title">
              <h2>{getPageTitle()}</h2>
            </div>

            <div className="header-actions d-flex align-items-center gap-3">
              {/* Notification Center */}
              <NotificationCenter />

              {/* User Menu Dropdown */}
              <div className="position-relative" ref={dropdownRef}>
                <button 
                  className="btn d-flex align-items-center gap-2"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#333',
                    cursor: 'pointer',
                    padding: '8px 0',
                    borderRadius: '0',
                    transition: 'all 0.2s',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#0d6efd';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#333';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                  </svg>
                  <span className="d-none d-md-inline">
                    {user?.profile?.name || user?.profile?.email || "Profile"}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{marginLeft: '4px'}}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                
                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div 
                    className="position-absolute end-0 mt-2 bg-white border rounded shadow-lg"
                    style={{minWidth: '240px', zIndex: 1000, top: '100%', borderColor: '#0d6efd', borderTop: '3px solid #0d6efd'}}
                  >
                    {/* User Info */}
                    <div className="px-4 py-3 border-bottom" style={{backgroundColor: '#f8f9ff'}}>
                      <div className="small text-muted">Signed in as</div>
                      <div className="fw-semibold" style={{color: '#0d6efd'}}>{user?.profile?.name || user?.profile?.email || "User"}</div>
                    </div>

                    {/* Switch Role - Only show if user has multiple roles */}
                    {hasMultipleRoles && (
                      <>
                        <div className="p-3">
                          <div className="small fw-semibold mb-2" style={{color: '#495057'}}>Switch Account</div>
                          <div className="d-grid gap-2">
                            {roles.map(role => (
                              <button
                                key={role}
                                onClick={() => handleRoleChange(role)}
                                className="btn w-100 text-start"
                                style={{
                                  backgroundColor: 'transparent',
                                  color: role === currentRole ? '#28a745' : '#495057',
                                  cursor: 'pointer',
                                  border: role === currentRole ? '2px solid #28a745' : 'none',
                                  borderRadius: '6px',
                                  padding: '8px 12px',
                                  fontSize: '0.875rem',
                                  transition: 'all 0.2s',
                                  fontWeight: role === currentRole ? '600' : '500'
                                }}
                                onMouseEnter={(e) => {
                                  if (role !== currentRole) {
                                    e.target.style.backgroundColor = '#f0f0f0';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (role !== currentRole) {
                                    e.target.style.backgroundColor = 'transparent';
                                  }
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline', marginRight: '8px'}}>
                                  {role === 'goal_setter' ? (
                                    <>
                                      <path d="M11 4h2v16h-2z"/>
                                      <path d="M4 11v2h16v-2z"/>
                                    </>
                                  ) : (
                                    <>
                                      <circle cx="9" cy="21" r="1"/>
                                      <circle cx="20" cy="21" r="1"/>
                                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                                    </>
                                  )}
                                </svg>
                                {getRoleLabel(role)}
                                {role === currentRole && <span style={{marginLeft: '8px', color: '#28a745', fontWeight: '700'}}>✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="border-top"></div>
                      </>
                    )}

                    {/* Logout */}
                    <div className="p-3">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="btn btn-outline-danger w-100"
                        style={{
                          borderColor: '#dc3545',
                          color: '#dc3545',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'all 0.2s',
                          border: '1px solid #dc3545'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#ffe5e5';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline', marginRight: '8px'}}>
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}



