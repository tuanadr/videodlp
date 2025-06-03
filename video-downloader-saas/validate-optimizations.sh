#!/bin/bash

# =============================================================================
# DOCKER SECURITY & PERFORMANCE VALIDATION SCRIPT
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
SECURITY_ISSUES=0
PERFORMANCE_ISSUES=0

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

print_failure() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if required tools are installed
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local tools=("docker" "docker-compose" "curl" "jq")
    for tool in "${tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            print_success "$tool is installed"
        else
            print_failure "$tool is not installed"
            exit 1
        fi
    done
}

# Validate Docker security configurations
validate_security() {
    print_header "Security Validation"
    
    # Check if secrets directory exists and has proper permissions
    if [ -d "secrets" ]; then
        local perms=$(stat -c "%a" secrets 2>/dev/null || stat -f "%A" secrets 2>/dev/null)
        if [ "$perms" = "700" ]; then
            print_success "Secrets directory has correct permissions (700)"
        else
            print_failure "Secrets directory permissions are $perms, should be 700"
            ((SECURITY_ISSUES++))
        fi
    else
        print_failure "Secrets directory not found"
        ((SECURITY_ISSUES++))
    fi
    
    # Check if secret files exist and have proper permissions
    local secret_files=("postgres_password.txt" "jwt_secret.txt" "database_url.txt")
    for file in "${secret_files[@]}"; do
        if [ -f "secrets/$file" ]; then
            local perms=$(stat -c "%a" "secrets/$file" 2>/dev/null || stat -f "%A" "secrets/$file" 2>/dev/null)
            if [ "$perms" = "600" ]; then
                print_success "Secret file $file has correct permissions (600)"
            else
                print_failure "Secret file $file permissions are $perms, should be 600"
                ((SECURITY_ISSUES++))
            fi
        else
            print_failure "Secret file $file not found"
            ((SECURITY_ISSUES++))
        fi
    done
    
    # Check Dockerfile security practices
    print_info "Checking Dockerfile security practices..."
    
    if grep -q "USER nodejs" backend/Dockerfile.optimized; then
        print_success "Backend runs as non-root user"
    else
        print_failure "Backend may be running as root"
        ((SECURITY_ISSUES++))
    fi
    
    if grep -q "USER nginx-app" frontend/Dockerfile.optimized; then
        print_success "Frontend runs as non-root user"
    else
        print_failure "Frontend may be running as root"
        ((SECURITY_ISSUES++))
    fi
    
    # Check for security options in docker-compose
    if grep -q "no-new-privileges:true" docker-compose.optimized.yml; then
        print_success "no-new-privileges security option is enabled"
    else
        print_failure "no-new-privileges security option is missing"
        ((SECURITY_ISSUES++))
    fi
    
    if grep -q "cap_drop:" docker-compose.optimized.yml; then
        print_success "Capability dropping is configured"
    else
        print_failure "Capability dropping is not configured"
        ((SECURITY_ISSUES++))
    fi
}

# Validate performance optimizations
validate_performance() {
    print_header "Performance Validation"
    
    # Check for multi-stage builds
    local stages_backend=$(grep -c "^FROM.*AS" backend/Dockerfile.optimized || echo 0)
    local stages_frontend=$(grep -c "^FROM.*AS" frontend/Dockerfile.optimized || echo 0)
    
    if [ "$stages_backend" -ge 3 ]; then
        print_success "Backend uses multi-stage build ($stages_backend stages)"
    else
        print_failure "Backend should use multi-stage build (found $stages_backend stages)"
        ((PERFORMANCE_ISSUES++))
    fi
    
    if [ "$stages_frontend" -ge 3 ]; then
        print_success "Frontend uses multi-stage build ($stages_frontend stages)"
    else
        print_failure "Frontend should use multi-stage build (found $stages_frontend stages)"
        ((PERFORMANCE_ISSUES++))
    fi
    
    # Check for resource limits
    if grep -q "resources:" docker-compose.optimized.yml; then
        print_success "Resource limits are configured"
    else
        print_failure "Resource limits are not configured"
        ((PERFORMANCE_ISSUES++))
    fi
    
    # Check for health checks
    if grep -q "healthcheck:" docker-compose.optimized.yml; then
        print_success "Health checks are configured"
    else
        print_failure "Health checks are not configured"
        ((PERFORMANCE_ISSUES++))
    fi
    
    # Check for caching optimizations
    if grep -q "cache-from\|cache-to" .github/workflows/ci-cd-optimized.yml; then
        print_success "Docker layer caching is configured in CI/CD"
    else
        print_warning "Docker layer caching not found in CI/CD"
    fi
}

# Test container builds
test_container_builds() {
    print_header "Container Build Tests"
    
    print_info "Building backend container..."
    if docker build -f backend/Dockerfile.optimized -t videodlp-backend:test backend/ > /dev/null 2>&1; then
        print_success "Backend container builds successfully"
        
        # Check image size
        local size=$(docker images videodlp-backend:test --format "{{.Size}}")
        print_info "Backend image size: $size"
        
        # Clean up test image
        docker rmi videodlp-backend:test > /dev/null 2>&1
    else
        print_failure "Backend container build failed"
    fi
    
    print_info "Building frontend container..."
    if docker build -f frontend/Dockerfile.optimized --build-arg REACT_APP_API_URL=http://localhost:5000 -t videodlp-frontend:test frontend/ > /dev/null 2>&1; then
        print_success "Frontend container builds successfully"
        
        # Check image size
        local size=$(docker images videodlp-frontend:test --format "{{.Size}}")
        print_info "Frontend image size: $size"
        
        # Clean up test image
        docker rmi videodlp-frontend:test > /dev/null 2>&1
    else
        print_failure "Frontend container build failed"
    fi
}

# Test deployment
test_deployment() {
    print_header "Deployment Test"
    
    print_info "Starting optimized deployment..."
    
    # Create minimal test environment
    if [ ! -d "secrets" ]; then
        mkdir -p secrets
        echo "test_password_$(date +%s)" > secrets/postgres_password.txt
        echo "test_jwt_secret_$(date +%s)" > secrets/jwt_secret.txt
        echo "postgresql://videodlp_user:test_password_$(date +%s)@postgres:5432/videodlp" > secrets/database_url.txt
        chmod 600 secrets/*
    fi
    
    if [ ! -d "data" ]; then
        mkdir -p data/{postgres,redis,downloads,logs,temp}
    fi
    
    # Start services
    if docker-compose -f docker-compose.optimized.yml up -d > /dev/null 2>&1; then
        print_success "Services started successfully"
        
        # Wait for services to be ready
        print_info "Waiting for services to be ready..."
        sleep 60
        
        # Test health endpoints
        local backend_health=false
        local frontend_health=false
        
        if curl -f http://localhost:5000/health > /dev/null 2>&1; then
            print_success "Backend health check passed"
            backend_health=true
        else
            print_failure "Backend health check failed"
        fi
        
        if curl -f http://localhost:3000/health.txt > /dev/null 2>&1; then
            print_success "Frontend health check passed"
            frontend_health=true
        else
            print_failure "Frontend health check failed"
        fi
        
        # Test API endpoints
        if $backend_health; then
            if curl -f http://localhost:5000/api/settings > /dev/null 2>&1; then
                print_success "API endpoints are accessible"
            else
                print_failure "API endpoints are not accessible"
            fi
        fi
        
        # Check container resource usage
        print_info "Checking resource usage..."
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -5
        
        # Stop services
        print_info "Stopping test deployment..."
        docker-compose -f docker-compose.optimized.yml down -v > /dev/null 2>&1
        
    else
        print_failure "Failed to start services"
    fi
}

# Run security scan if trivy is available
run_security_scan() {
    print_header "Security Vulnerability Scan"
    
    if command -v trivy &> /dev/null; then
        print_info "Running Trivy security scan..."
        
        # Build images for scanning
        docker build -f backend/Dockerfile.optimized -t videodlp-backend:scan backend/ > /dev/null 2>&1
        docker build -f frontend/Dockerfile.optimized --build-arg REACT_APP_API_URL=http://localhost:5000 -t videodlp-frontend:scan frontend/ > /dev/null 2>&1
        
        # Scan backend
        local backend_vulns=$(trivy image --quiet --format json videodlp-backend:scan | jq '.Results[0].Vulnerabilities | length' 2>/dev/null || echo "0")
        if [ "$backend_vulns" -eq 0 ]; then
            print_success "Backend image has no vulnerabilities"
        else
            print_warning "Backend image has $backend_vulns vulnerabilities"
        fi
        
        # Scan frontend
        local frontend_vulns=$(trivy image --quiet --format json videodlp-frontend:scan | jq '.Results[0].Vulnerabilities | length' 2>/dev/null || echo "0")
        if [ "$frontend_vulns" -eq 0 ]; then
            print_success "Frontend image has no vulnerabilities"
        else
            print_warning "Frontend image has $frontend_vulns vulnerabilities"
        fi
        
        # Clean up scan images
        docker rmi videodlp-backend:scan videodlp-frontend:scan > /dev/null 2>&1
        
    else
        print_warning "Trivy not installed, skipping vulnerability scan"
        print_info "Install Trivy: https://github.com/aquasecurity/trivy"
    fi
}

# Validate CI/CD configuration
validate_cicd() {
    print_header "CI/CD Configuration Validation"
    
    if [ -f ".github/workflows/ci-cd-optimized.yml" ]; then
        print_success "CI/CD workflow file exists"
        
        # Check for required jobs
        local jobs=("security-scan" "backend-test" "frontend-test" "docker-build" "e2e-test")
        for job in "${jobs[@]}"; do
            if grep -q "$job:" .github/workflows/ci-cd-optimized.yml; then
                print_success "CI/CD job '$job' is configured"
            else
                print_failure "CI/CD job '$job' is missing"
            fi
        done
        
    else
        print_failure "CI/CD workflow file not found"
    fi
}

# Generate validation report
generate_report() {
    print_header "Validation Report"
    
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local success_rate=0
    
    if [ "$total_tests" -gt 0 ]; then
        success_rate=$((TESTS_PASSED * 100 / total_tests))
    fi
    
    echo -e "\n📊 ${BLUE}SUMMARY${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo -e "Success Rate: ${BLUE}$success_rate%${NC}"
    echo -e "Security Issues: ${RED}$SECURITY_ISSUES${NC}"
    echo -e "Performance Issues: ${YELLOW}$PERFORMANCE_ISSUES${NC}"
    
    echo -e "\n🎯 ${BLUE}RECOMMENDATIONS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$SECURITY_ISSUES" -gt 0 ]; then
        echo -e "${RED}🔒 Address $SECURITY_ISSUES security issues before deployment${NC}"
    else
        echo -e "${GREEN}🔒 Security configuration looks good${NC}"
    fi
    
    if [ "$PERFORMANCE_ISSUES" -gt 0 ]; then
        echo -e "${YELLOW}⚡ Consider addressing $PERFORMANCE_ISSUES performance optimizations${NC}"
    else
        echo -e "${GREEN}⚡ Performance optimizations are properly configured${NC}"
    fi
    
    if [ "$success_rate" -ge 90 ]; then
        echo -e "${GREEN}🚀 System is ready for deployment${NC}"
    elif [ "$success_rate" -ge 70 ]; then
        echo -e "${YELLOW}⚠️  System needs some improvements before deployment${NC}"
    else
        echo -e "${RED}❌ System requires significant fixes before deployment${NC}"
    fi
    
    echo -e "\n📚 ${BLUE}NEXT STEPS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. Review DOCKER-SECURITY-OPTIMIZATION-GUIDE.md"
    echo "2. Run ./setup-optimized-deployment.sh if not done"
    echo "3. Execute ./deploy-optimized.sh for deployment"
    echo "4. Monitor with ./monitor-optimized.sh"
    echo "5. Schedule regular ./security-audit.sh runs"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "🐳 Docker Security & Performance Validation"
    echo "============================================="
    echo -e "${NC}"
    
    check_prerequisites
    validate_security
    validate_performance
    test_container_builds
    validate_cicd
    run_security_scan
    
    # Only run deployment test if explicitly requested
    if [ "$1" = "--full" ]; then
        test_deployment
    else
        print_info "Skipping deployment test (use --full to include)"
    fi
    
    generate_report
    
    # Exit with appropriate code
    if [ "$TESTS_FAILED" -eq 0 ] && [ "$SECURITY_ISSUES" -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function with all arguments
main "$@"