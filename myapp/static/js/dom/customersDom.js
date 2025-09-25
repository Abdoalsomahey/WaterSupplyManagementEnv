import { 
    api_GetCustomers, 
    api_CreateCustomer, 
    api_GetCustomer, 
    api_UpdateCustomer, 
    api_PartialUpdateCustomer, 
    api_DeleteCustomer, 
    api_ExportCustomers 
} from '../apis.js';

let currentCustomers = [];
let currentPage = 1;
const itemsPerPage = 10;
let totalCount = 0;
let nextPage = null;
let previousPage = null;
let currentQueryParams = '';

export function initCustomers() {
    loadCustomers();
    setupEventListeners();
}

async function loadCustomers(queryParams = '') {
    try {
        showLoadingState();
        
        const response = await api_GetCustomers(queryParams);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentCustomers = data.results;
        totalCount = data.count;
        nextPage = data.next;
        previousPage = data.previous;
        currentQueryParams = queryParams;
        
        updateCustomersTable();
        updatePagination();
        updateCustomerCounts();
        
    } catch (error) {
        console.error('Error loading customers:', error);
        showErrorState('Failed to load customers');
    }
}

function updateCustomersTable() {
    const tbody = document.getElementById('customers-table');
    
    if (currentCustomers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 mb-3 d-block"></i>
                    No customers found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = currentCustomers.map(customer => `
        <tr>
            <td>
                <input type="checkbox" class="form-check-input customer-checkbox" value="${customer.id}">
            </td>
            <td>
                <div class="fw-semibold">${customer.full_name || 'N/A'}</div>
                <small class="text-muted">ID: ${customer.id}</small>
            </td>
            <td>${customer.driver || 'N/A'}</td>
            <td>${customer.area || 'N/A'}</td>
            <td>${customer.zone_number || 'N/A'}</td>
            <td>${customer.plot_number || 'N/A'}</td>
            <td>${customer.phone || 'N/A'}</td>
            <td>
                <span class="badge bg-${getStatusColor(customer.agreement_without_meter)}">
                    ${customer.agreement_without_meter ? 'Without Meter' : 'With Meter'}
                </span>
            </td>
            <td>${customer.weekly_trips || 0}</td>
            <td>${formatTime(customer.delivery_time)}</td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary btn-action" onclick="viewCustomer(${customer.id})" title="View">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning btn-action" onclick="editCustomer(${customer.id})" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteCustomer(${customer.id})" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updateBulkActionsVisibility();
}

function updatePagination() {
    const pagination = document.getElementById('customers-pagination');
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${!previousPage ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage('${previousPage || ''}')">Previous</a>
        </li>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${!nextPage ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage('${nextPage || ''}')">Next</a>
        </li>
    `;
    
    pagination.innerHTML = paginationHTML;
}

function updateCustomerCounts() {
    document.getElementById('customers-count').textContent = currentCustomers.length;
    document.getElementById('total-customers').textContent = totalCount;
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 500));
    }
    
    // Filter functionality
    const areaFilter = document.getElementById('area-filter');
    const statusFilter = document.getElementById('status-filter');
    
    if (areaFilter) {
        areaFilter.addEventListener('change', handleFilter);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', handleFilter);
    }
    
    // Clear filters
    const clearBtn = document.getElementById('clear-filters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearFilters);
    }
    
    // Select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', handleSelectAll);
    }
    
    // Bulk actions
    const bulkExportBtn = document.getElementById('bulk-export');
    if (bulkExportBtn) {
        bulkExportBtn.addEventListener('click', handleBulkExport);
    }
    
    // Export button
    const exportBtn = document.getElementById('export-customers');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }
    
    // Add customer button
    const addCustomerBtn = document.getElementById('add-customer');
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', showAddCustomerModal);
    }
}

function handleSearch(e) {
    const searchTerm = e.target.value.trim();
    let queryParams = '';
    
    if (searchTerm) {
        queryParams = `?search=${encodeURIComponent(searchTerm)}`;
    }
    
    currentPage = 1;
    loadCustomers(queryParams);
}

function handleFilter() {
    const areaFilter = document.getElementById('area-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    
    let queryParams = '?';
    const params = [];
    
    if (areaFilter) {
        params.push(`area=${encodeURIComponent(areaFilter)}`);
    }
    
    if (statusFilter) {
        params.push(`agreement_without_meter=${statusFilter === 'without'}`);
    }
    
    queryParams += params.join('&');
    currentPage = 1;
    loadCustomers(queryParams);
}

function clearFilters() {
    document.getElementById('customer-search').value = '';
    document.getElementById('area-filter').value = '';
    document.getElementById('status-filter').value = '';
    
    currentPage = 1;
    loadCustomers('');
}

function handleSelectAll(e) {
    const checkboxes = document.querySelectorAll('.customer-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
    });
    updateBulkActionsVisibility();
}

function updateBulkActionsVisibility() {
    const checkedBoxes = document.querySelectorAll('.customer-checkbox:checked');
    const bulkActions = document.getElementById('bulk-actions');
    
    if (checkedBoxes.length > 0) {
        bulkActions.style.display = 'flex';
    } else {
        bulkActions.style.display = 'none';
    }
}

async function handleBulkExport() {
    const checkedBoxes = document.querySelectorAll('.customer-checkbox:checked');
    const customerIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
    
    if (customerIds.length === 0) {
        alert('Please select customers to export');
        return;
    }
    
    try {
        const queryParams = currentQueryParams ? `${currentQueryParams}&ids=${customerIds.join(',')}` : `?ids=${customerIds.join(',')}`;
        const response = await api_ExportCustomers(queryParams);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'customers_export.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Error exporting customers');
    }
}

async function handleExport() {
    try {
        const response = await api_ExportCustomers(currentQueryParams);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'customers_export.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Error exporting customers');
    }
}

// Modal Functions
function showAddCustomerModal() {
    const modalHTML = `
        <div class="modal fade" id="addCustomerModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add New Customer</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addCustomerForm">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">Full Name *</label>
                                    <input type="text" class="form-control" name="full_name" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Phone *</label>
                                    <input type="tel" class="form-control" name="phone" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Area</label>
                                    <input type="text" class="form-control" name="area">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Zone Number</label>
                                    <input type="text" class="form-control" name="zone_number">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Plot Number</label>
                                    <input type="text" class="form-control" name="plot_number">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Property Type</label>
                                    <input type="text" class="form-control" name="property_type">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Account Number</label>
                                    <input type="text" class="form-control" name="account_number">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Starting Date</label>
                                    <input type="date" class="form-control" name="starting_date">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Weekly Trips</label>
                                    <input type="number" class="form-control" name="weekly_trips" value="0">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Delivery Time</label>
                                    <input type="time" class="form-control" name="delivery_time">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Gallons</label>
                                    <input type="number" class="form-control" name="gallons" value="0">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Filling Stations</label>
                                    <input type="text" class="form-control" name="filling_stations">
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Location Link</label>
                                    <input type="url" class="form-control" name="location_link">
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Delivery Days</label>
                                    <div class="delivery-days-checkboxes">
                                        ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                                            .map(day => `
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="checkbox" name="delivery_days" value="${day.toLowerCase()}">
                                                <label class="form-check-label">${day}</label>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="agreement_without_meter">
                                        <label class="form-check-label">Agreement Without Meter</label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveCustomer()">Save Customer</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('addCustomerModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('addCustomerModal'));
    modal.show();
}

// Global functions for inline event handlers
window.viewCustomer = async function(customerId) {
    try {
        const response = await api_GetCustomer(customerId);
        if (response.ok) {
            const customer = await response.json();
            showCustomerModal(customer, 'view');
        }
    } catch (error) {
        console.error('Error viewing customer:', error);
        alert('Error loading customer details');
    }
};

window.editCustomer = async function(customerId) {
    try {
        const response = await api_GetCustomer(customerId);
        if (response.ok) {
            const customer = await response.json();
            showCustomerModal(customer, 'edit');
        }
    } catch (error) {
        console.error('Error editing customer:', error);
        alert('Error loading customer details');
    }
};

window.deleteCustomer = async function(customerId) {
    const customer = currentCustomers.find(c => c.id === customerId);
    if (customer && confirm(`Are you sure you want to delete customer: ${customer.full_name}?`)) {
        try {
            const response = await api_DeleteCustomer(customerId);
            if (response.ok) {
                loadCustomers(currentQueryParams);
                alert('Customer deleted successfully');
            } else {
                throw new Error('Delete failed');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Error deleting customer');
        }
    }
};

window.changePage = function(page) {
    if (typeof page === 'string' && page.includes('page=')) {
        // Handle next/previous URLs
        const url = new URL(page);
        const queryParams = url.search;
        loadCustomers(queryParams);
    } else {
        // Handle page numbers
        const baseParams = currentQueryParams ? currentQueryParams + '&' : '?';
        loadCustomers(`${baseParams}page=${page}`);
    }
};

window.saveCustomer = async function() {
    const form = document.getElementById('addCustomerForm');
    const formData = new FormData(form);
    
    const customerData = {
        full_name: formData.get('full_name'),
        phone: formData.get('phone'),
        area: formData.get('area'),
        zone_number: formData.get('zone_number'),
        plot_number: formData.get('plot_number'),
        property_type: formData.get('property_type'),
        account_number: formData.get('account_number'),
        starting_date: formData.get('starting_date'),
        weekly_trips: parseInt(formData.get('weekly_trips')) || 0,
        delivery_time: formData.get('delivery_time'),
        gallons: parseInt(formData.get('gallons')) || 0,
        filling_stations: formData.get('filling_stations'),
        location_link: formData.get('location_link'),
        agreement_without_meter: formData.get('agreement_without_meter') === 'on',
        delivery_days: Array.from(formData.getAll('delivery_days'))
    };
    
    try {
        const response = await api_CreateCustomer(customerData);
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addCustomerModal'));
            modal.hide();
            loadCustomers(currentQueryParams);
            alert('Customer created successfully');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Create failed');
        }
    } catch (error) {
        console.error('Error creating customer:', error);
        alert('Error creating customer: ' + error.message);
    }
};

// Helper functions
function getStatusColor(agreementWithoutMeter) {
    return agreementWithoutMeter ? 'warning' : 'success';
}

function formatTime(timeString) {
    if (!timeString) return 'N/A';
    return timeString.split('T')[1]?.split('.')[0] || timeString;
}

function showLoadingState() {
    const tbody = document.getElementById('customers-table');
    tbody.innerHTML = `
        <tr>
            <td colspan="11" class="text-center text-muted py-4">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Loading customers...
            </td>
        </tr>
    `;
}

function showErrorState(message) {
    const tbody = document.getElementById('customers-table');
    tbody.innerHTML = `
        <tr>
            <td colspan="11" class="text-center text-muted py-4">
                <i class="bi bi-exclamation-triangle fs-1 mb-3 d-block text-danger"></i>
                ${message}
            </td>
        </tr>
    `;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Customer Modal for View/Edit
function showCustomerModal(customer, mode) {
    const modalTitle = mode === 'view' ? 'View Customer' : 'Edit Customer';
    const readOnly = mode === 'view' ? 'readonly' : '';
    
    const modalHTML = `
        <div class="modal fade" id="customerModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${modalTitle} - ${customer.full_name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="customerForm">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">Full Name</label>
                                    <input type="text" class="form-control" name="full_name" value="${customer.full_name || ''}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Phone</label>
                                    <input type="tel" class="form-control" name="phone" value="${customer.phone || ''}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Area</label>
                                    <input type="text" class="form-control" name="area" value="${customer.area || ''}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Zone Number</label>
                                    <input type="text" class="form-control" name="zone_number" value="${customer.zone_number || ''}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Plot Number</label>
                                    <input type="text" class="form-control" name="plot_number" value="${customer.plot_number || ''}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Property Type</label>
                                    <input type="text" class="form-control" name="property_type" value="${customer.property_type || ''}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Account Number</label>
                                    <input type="text" class="form-control" name="account_number" value="${customer.account_number || ''}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Starting Date</label>
                                    <input type="date" class="form-control" name="starting_date" value="${customer.starting_date || ''}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Weekly Trips</label>
                                    <input type="number" class="form-control" name="weekly_trips" value="${customer.weekly_trips || 0}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Delivery Time</label>
                                    <input type="time" class="form-control" name="delivery_time" value="${formatTime(customer.delivery_time)}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Gallons</label>
                                    <input type="number" class="form-control" name="gallons" value="${customer.gallons || 0}" ${readOnly}>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Filling Stations</label>
                                    <input type="text" class="form-control" name="filling_stations" value="${customer.filling_stations || ''}" ${readOnly}>
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Location Link</label>
                                    <input type="url" class="form-control" name="location_link" value="${customer.location_link || ''}" ${readOnly}>
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Delivery Days</label>
                                    <div class="delivery-days-checkboxes">
                                        ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                                            .map(day => `
                                            <div class="form-check form-check-inline">
                                                <input class="form-check-input" type="checkbox" name="delivery_days" value="${day}" 
                                                    ${customer.delivery_days?.includes(day) ? 'checked' : ''} ${readOnly ? 'disabled' : ''}>
                                                <label class="form-check-label">${day.charAt(0).toUpperCase() + day.slice(1)}</label>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="agreement_without_meter" 
                                            ${customer.agreement_without_meter ? 'checked' : ''} ${readOnly ? 'disabled' : ''}>
                                        <label class="form-check-label">Agreement Without Meter</label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        ${mode === 'edit' ? `
                            <button type="button" class="btn btn-primary" onclick="updateCustomer(${customer.id})">Update Customer</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('customerModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('customerModal'));
    modal.show();
}

window.updateCustomer = async function(customerId) {
    const form = document.getElementById('customerForm');
    const formData = new FormData(form);
    
    const customerData = {
        full_name: formData.get('full_name'),
        phone: formData.get('phone'),
        area: formData.get('area'),
        zone_number: formData.get('zone_number'),
        plot_number: formData.get('plot_number'),
        property_type: formData.get('property_type'),
        account_number: formData.get('account_number'),
        starting_date: formData.get('starting_date'),
        weekly_trips: parseInt(formData.get('weekly_trips')) || 0,
        delivery_time: formData.get('delivery_time'),
        gallons: parseInt(formData.get('gallons')) || 0,
        filling_stations: formData.get('filling_stations'),
        location_link: formData.get('location_link'),
        agreement_without_meter: formData.get('agreement_without_meter') === 'on',
        delivery_days: Array.from(formData.getAll('delivery_days'))
    };
    
    try {
        const response = await api_PartialUpdateCustomer(customerId, customerData);
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('customerModal'));
            modal.hide();
            loadCustomers(currentQueryParams);
            alert('Customer updated successfully');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Update failed');
        }
    } catch (error) {
        console.error('Error updating customer:', error);
        alert('Error updating customer: ' + error.message);
    }
};