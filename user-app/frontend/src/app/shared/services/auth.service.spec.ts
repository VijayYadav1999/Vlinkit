import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, AuthResponse, SignupData, AuthCredentials, User } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3000/api/auth';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Component Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with no current user', () => {
      const user = service.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should initialize currentUser$ as observable', (done) => {
      service.currentUser$.subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });

    it('should initialize authToken$ as observable', (done) => {
      service.authToken$.subscribe(token => {
        expect(token).toBeNull();
        done();
      });
    });

    it('should restore user from localStorage if exists', () => {
      const mockUser: User = {
        id: 'user-001',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        role: 'USER'
      };

      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      localStorage.setItem('accessToken', 'test-token');

      // Create new service instance
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule));
      
      expect(newService.getCurrentUser()).toEqual(mockUser);
    });
  });

  describe('Login', () => {
    const credentials: AuthCredentials = {
      email: 'user@example.com',
      password: 'password123'
    };

    const mockUser: User = {
      id: 'user-001',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '9876543210',
      role: 'USER'
    };

    const mockResponse: AuthResponse = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      user: mockUser
    };

    it('should login with valid credentials', (done) => {
      service.login(credentials).subscribe(response => {
        expect(response.user.email).toBe('user@example.com');
        expect(response.accessToken).toBe('test-access-token');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should store tokens on successful login', (done) => {
      service.login(credentials).subscribe(() => {
        const storedToken = localStorage.getItem('accessToken');
        expect(storedToken).toBe('test-access-token');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockResponse);
    });

    it('should set current user on successful login', (done) => {
      service.login(credentials).subscribe(() => {
        const user = service.getCurrentUser();
        expect(user).toEqual(mockUser);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockResponse);
    });

    it('should emit current user observable on login', (done) => {
      service.currentUser$.subscribe(user => {
        if (user && user.email === 'user@example.com') {
          expect(user).toEqual(mockUser);
          done();
        }
      });

      service.login(credentials).subscribe(() => {});

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush(mockResponse);
    });

    it('should fail with invalid credentials', (done) => {
      service.login(credentials).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error).toBeTruthy();
          done();
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush('Invalid credentials', { status: 401, statusText: 'Unauthorized' });
    });

    it('should fail with locked account', (done) => {
      service.login(credentials).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error).toBeTruthy();
          done();
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush('Account is locked', { status: 403, statusText: 'Forbidden' });
    });

    it('should fail with server error', (done) => {
      service.login(credentials).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error).toBeTruthy();
          done();
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/login`);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Signup', () => {
    const signupData: SignupData = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      phone: '9876543210',
      role: 'USER'
    };

    const mockUser: User = {
      id: 'user-002',
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      phone: '9876543210',
      role: 'USER'
    };

    const mockResponse: AuthResponse = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: mockUser
    };

    it('should signup with valid data', (done) => {
      service.signup(signupData).subscribe(response => {
        expect(response.user.email).toBe('newuser@example.com');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should validate email format on signup', (done) => {
      const invalidData = { ...signupData, email: 'invalid-email' };
      
      service.signup(invalidData).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.message).toContain('Invalid email');
          done();
        }
      );
    });

    it('should validate password length on signup', (done) => {
      const invalidData = { ...signupData, password: 'short' };
      
      service.signup(invalidData).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.message).toContain('at least 8 characters');
          done();
        }
      );
    });

    it('should store tokens on successful signup', (done) => {
      service.signup(signupData).subscribe(() => {
        const storedToken = localStorage.getItem('accessToken');
        expect(storedToken).toBe('new-access-token');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.flush(mockResponse);
    });

    it('should set current user on successful signup', (done) => {
      service.signup(signupData).subscribe(() => {
        const user = service.getCurrentUser();
        expect(user).toEqual(mockUser);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.flush(mockResponse);
    });

    it('should fail with duplicate email', (done) => {
      service.signup(signupData).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error).toBeTruthy();
          done();
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/register`);
      req.flush('Email already registered', { status: 409, statusText: 'Conflict' });
    });
  });

  describe('Logout', () => {
    it('should clear tokens on logout', (done) => {
      localStorage.setItem('accessToken', 'test-token');
      localStorage.setItem('refreshToken', 'test-refresh');
      
      service.logout().subscribe(() => {
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
        done();
      });
    });

    it('should clear current user on logout', (done) => {
      localStorage.setItem('currentUser', JSON.stringify({ email: 'test@example.com' }));
      
      service.logout().subscribe(() => {
        expect(service.getCurrentUser()).toBeNull();
        done();
      });
    });

    it('should emit null user on logout', (done) => {
      let userCount = 0;
      service.currentUser$.subscribe(user => {
        userCount++;
        if (userCount === 2 && user === null) {
          done();
        }
      });

      service.logout().subscribe(() => {});
    });
  });

  describe('OAuth Validation', () => {
    it('should validate Google OAuth token', (done) => {
      const mockUser: User = {
        id: 'user-003',
        email: 'user@gmail.com',
        firstName: 'Google',
        lastName: 'User',
        phone: '9876543210',
        role: 'USER'
      };

      const mockResponse: AuthResponse = {
        accessToken: 'google-token',
        refreshToken: 'google-refresh',
        user: mockUser
      };

      service.validateOAuth('google', 'google-oauth-token').subscribe(response => {
        expect(response.user.email).toBe('user@gmail.com');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/oauth/validate`);
      expect(req.request.body.provider).toBe('google');
      req.flush(mockResponse);
    });

    it('should validate Facebook OAuth token', (done) => {
      const mockUser: User = {
        id: 'user-004',
        email: 'user@facebook.com',
        firstName: 'Facebook',
        lastName: 'User',
        phone: '9876543210',
        role: 'USER'
      };

      const mockResponse: AuthResponse = {
        accessToken: 'facebook-token',
        refreshToken: 'facebook-refresh',
        user: mockUser
      };

      service.validateOAuth('facebook', 'facebook-oauth-token').subscribe(response => {
        expect(response.user.email).toBe('user@facebook.com');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/oauth/validate`);
      expect(req.request.body.provider).toBe('facebook');
      req.flush(mockResponse);
    });

    it('should fail with invalid provider', (done) => {
      service.validateOAuth('invalid' as any, 'token').subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.message).toContain('Invalid OAuth provider');
          done();
        }
      );
    });

    it('should fail with missing token', (done) => {
      service.validateOAuth('google', '').subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.message).toContain('Invalid OAuth provider or token');
          done();
        }
      );
    });

    it('should store tokens on successful OAuth', (done) => {
      const mockResponse: AuthResponse = {
        accessToken: 'oauth-access-token',
        refreshToken: 'oauth-refresh-token',
        user: { id: 'user-005', email: 'oauth@example.com', firstName: 'OAuth', lastName: 'User', phone: '9876543210', role: 'USER' }
      };

      service.validateOAuth('google', 'token').subscribe(() => {
        expect(localStorage.getItem('accessToken')).toBe('oauth-access-token');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/oauth/validate`);
      req.flush(mockResponse);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', (done) => {
      localStorage.setItem('refreshToken', 'test-refresh-token');

      const mockUser: User = {
        id: 'user-001',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '9876543210',
        role: 'USER'
      };

      const mockResponse: AuthResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockUser
      };

      service.refreshToken().subscribe(response => {
        expect(response.accessToken).toBe('new-access-token');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/refresh`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should update stored tokens after refresh', (done) => {
      localStorage.setItem('refreshToken', 'test-refresh-token');

      const mockResponse: AuthResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: 'user-001', email: 'user@example.com', firstName: 'John', lastName: 'Doe', phone: '9876543210', role: 'USER' }
      };

      service.refreshToken().subscribe(() => {
        expect(localStorage.getItem('accessToken')).toBe('new-access-token');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/refresh`);
      req.flush(mockResponse);
    });

    it('should fail without refresh token', (done) => {
      service.refreshToken().subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.message).toContain('No refresh token available');
          done();
        }
      );
    });

    it('should clear auth on refresh failure', (done) => {
      localStorage.setItem('refreshToken', 'test-refresh-token');
      localStorage.setItem('accessToken', 'old-token');

      service.refreshToken().subscribe(
        () => fail('should have failed'),
        () => {
          expect(localStorage.getItem('accessToken')).toBeNull();
          expect(service.getCurrentUser()).toBeNull();
          done();
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/refresh`);
      req.flush('Token refresh failed', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Current User Management', () => {
    it('should get current user', () => {
      const mockUser: User = {
        id: 'user-001',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        role: 'USER'
      };

      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      const user = service.getCurrentUser();

      expect(user).toEqual(mockUser);
    });

    it('should return null if no current user', () => {
      const user = service.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should provide currentUser as observable', (done) => {
      const mockUser: User = {
        id: 'user-001',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        role: 'USER'
      };

      service['setCurrentUser'] = (user: User | null) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        service['currentUserSubject'].next(user);
      };

      service['setCurrentUser'](mockUser);

      service.getCurrentUserObservable().subscribe(user => {
        if (user) {
          expect(user.email).toBe('test@example.com');
          done();
        }
      });
    });
  });

  describe('Authentication State Checks', () => {
    it('should return true for authenticated user with valid token', () => {
      localStorage.setItem('accessToken', 'valid-token');
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false for unauthenticated user', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return false when token is missing', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('Authorization Headers', () => {
    it('should include Bearer token in authorization header', () => {
      localStorage.setItem('accessToken', 'test-token');
      const headers = service.getAuthorizationHeader();

      expect(headers.get('Authorization')).toBe('Bearer test-token');
    });

    it('should not include Bearer token if no token available', () => {
      const headers = service.getAuthorizationHeader();
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should include content-type in headers', () => {
      const headers = service.getAuthorizationHeader();
      expect(headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Mock Methods (for testing)', () => {
    it('should perform mock login', (done) => {
      const credentials: AuthCredentials = {
        email: 'user@example.com',
        password: 'password123'
      };

      service.mockLogin(credentials).subscribe(response => {
        expect(response.user.email).toBe('user@example.com');
        expect(response.accessToken).toContain('mock-access-token');
        done();
      });
    });

    it('should fail mock login with invalid credentials', (done) => {
      const credentials: AuthCredentials = {
        email: 'user@example.com',
        password: 'wrongpassword'
      };

      service.mockLogin(credentials).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.message).toContain('Invalid email or password');
          done();
        }
      );
    });

    it('should perform mock Google OAuth', (done) => {
      service.mockOAuthGoogle('mock-google-token').subscribe(response => {
        expect(response.user.email).toContain('@');
        expect(response.accessToken).toContain('mock-google-token');
        done();
      });
    });

    it('should return mock credentials for testing', () => {
      const credentials = service.getMockCredentials();
      expect(credentials.length).toBe(3);
      expect(credentials[0].email).toBe('user@example.com');
      expect(credentials[1].email).toBe('driver@example.com');
      expect(credentials[2].email).toBe('admin@example.com');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email format', (done) => {
      const validData: SignupData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        role: 'USER'
      };

      // Should not throw error immediately
      service.signup(validData).subscribe(
        () => {},
        (error) => {
          // Will fail on HTTP call, not validation
          done();
        }
      );

      // Kill pending HTTP request
      httpMock.expectOne(`${apiUrl}/register`);
    });

    it('should reject invalid email format', (done) => {
      const invalidData: SignupData = {
        email: 'invalid.email',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        role: 'USER'
      };

      service.signup(invalidData).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.message).toContain('Invalid email');
          done();
        }
      );
    });
  });

  describe('Password Validation', () => {
    it('should reject passwords shorter than 8 characters', (done) => {
      const invalidData: SignupData = {
        email: 'test@example.com',
        password: 'pass123', // 7 characters
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        role: 'USER'
      };

      service.signup(invalidData).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error.message).toContain('at least 8 characters');
          done();
        }
      );
    });

    it('should accept passwords of 8 or more characters', (done) => {
      const validData: SignupData = {
        email: 'test@example.com',
        password: 'password123', // 11 characters
        firstName: 'Test',
        lastName: 'User',
        phone: '9876543210',
        role: 'USER'
      };

      service.signup(validData).subscribe(() => {
        // Expected to fail on HTTP, not validation
        done();
      }, (error) => {
        // HTTP error is expected
        done();
      });

      httpMock.expectOne(`${apiUrl}/register`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed localStorage data', () => {
      localStorage.setItem('currentUser', '{invalid json}');
      const user = service.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should handle empty email login attempt', (done) => {
      service.mockLogin({ email: '', password: 'password' }).subscribe(
        () => fail('should have failed'),
        error => {
          expect(error).toBeTruthy();
          done();
        }
      );
    });

    it('should handle concurrent login attempts', (done) => {
      const credentials: AuthCredentials = {
        email: 'user@example.com',
        password: 'password123'
      };

      const mockResponse: AuthResponse = {
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: 'user-001', email: 'user@example.com', firstName: 'John', lastName: 'Doe', phone: '9876543210', role: 'USER' }
      };

      service.login(credentials).subscribe(() => {});
      service.login(credentials).subscribe(() => {
        done();
      });

      const requests = httpMock.match(`${apiUrl}/login`);
      expect(requests.length).toBe(2);
      requests.forEach(req => req.flush(mockResponse));
    });
  });
});
