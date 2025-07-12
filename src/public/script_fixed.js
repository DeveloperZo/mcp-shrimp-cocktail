// FIXED PLAN MANAGEMENT FUNCTIONS
// Key changes:
// 1. Star (★) only shows for currently selected plan, not "active" plans
// 2. Button always enabled (no "Already Active" state)
// 3. Uses "current plan" concept instead of non-existent "active plan" concept

// Fixed renderPlanSelector function
function renderPlanSelector() {
  if (!planSelector) return;
  
  // Clear existing options
  planSelector.innerHTML = '';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = translate('plan_selector_placeholder') || 'Select a plan...';
  planSelector.appendChild(defaultOption);
  
  // Add plan options (only show star for currently selected plan)
  plans.forEach(plan => {
    const option = document.createElement('option');
    option.value = plan.id;
    
    // Only show star for the currently selected plan (indicating current working plan)
    if (plan.id === currentPlan) {
      option.textContent = `★ ${plan.name}`; // Star indicates current plan
      option.style.fontWeight = 'bold';
      option.style.color = '#4cd137'; // Use theme color
    } else {
      option.textContent = plan.name;
    }
    
    if (plan.id === currentPlan) {
      option.selected = true;
    }
    planSelector.appendChild(option);
  });
  
  // If no current plan selected and plans exist, select the first one
  if (!currentPlan && plans.length > 0) {
    currentPlan = plans[0].id;
    planSelector.value = currentPlan;
  }
  
  // Update set current plan button state
  updateSetCurrentPlanButton();
  
  // Update plan header display
  updatePlanHeader();
}

// Fixed updateSetCurrentPlanButton function (renamed)
function updateSetCurrentPlanButton() {
  if (!setActivePlanBtn) return;

  // Check if a plan is selected
  const hasSelectedPlan = currentPlan && currentPlan !== '';
  
  // Button is always enabled when a plan is selected (you can always re-set current plan)
  // Only disable during loading
  const shouldEnable = hasSelectedPlan && !setActivePlanBtn.classList.contains('loading');
  setActivePlanBtn.disabled = !shouldEnable;

  // Update button text and title
  const buttonText = setActivePlanBtn.querySelector('span');
  const buttonTitle = setActivePlanBtn;
  
  if (!hasSelectedPlan) {
    if (buttonText) buttonText.textContent = translate('set_current_plan_btn_text') || 'Set Current';
    buttonTitle.title = translate('set_current_plan_select_plan') || 'Select a plan first';
  } else {
    if (buttonText) buttonText.textContent = translate('set_current_plan_btn_text') || 'Set Current';
    buttonTitle.title = translate('set_current_plan_btn_title') || 'Set as Current Plan';
  }
}

// Fixed updatePlanHeader function
function updatePlanHeader() {
  if (!planHeaderElement || !planNameElement || !planIdElement) {
    console.warn('Plan header elements not found');
    return;
  }

  // Check if a plan is selected
  if (!currentPlan || currentPlan === '') {
    // Hide header when no plan selected
    planHeaderElement.style.display = 'none';
    return;
  }

  // Find current plan details
  const selectedPlan = plans.find(plan => plan.id === currentPlan);
  
  if (!selectedPlan) {
    // Hide header if plan info not found
    planHeaderElement.style.display = 'none';
    return;
  }

  // Update plan name, show star for currently selected plan
  const isCurrentPlan = selectedPlan.id === currentPlan;
  
  // Set plan name, add star for current plan
  const displayName = isCurrentPlan ? `★ ${selectedPlan.name}` : selectedPlan.name;
  planNameElement.textContent = displayName;
  
  if (isCurrentPlan) {
    planNameElement.style.color = 'var(--accent-color)';
  } else {
    planNameElement.style.color = 'var(--primary-color)';
  }

  // Update plan ID
  planIdElement.textContent = selectedPlan.id;

  // Show plan header
  planHeaderElement.style.display = 'block';
}

// Fixed setCurrentPlan function (renamed from setActivePlan)
async function setCurrentPlan() {
  if (!currentProject || !currentPlan) {
    console.warn('No project or plan selected');
    return;
  }

  // Get current selected plan name (strip star if present)
  const selectedPlanOption = planSelector.options[planSelector.selectedIndex];
  const planName = selectedPlanOption ? selectedPlanOption.textContent.replace('★ ', '') : 'Unknown Plan';

  try {
    // Set button to loading state
    setActivePlanBtn.classList.add('loading');
    setActivePlanBtn.disabled = true;
    
    const response = await fetch('/api/plans/set-active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectName: currentProject,
        planName: currentPlan
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = translate('set_current_plan_success', { planName }) || `Plan "${planName}" set as current!`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);

    // Update plan selector and button state
    await fetchPlans();
    syncPlanSelector(); // Sync selector state

  } catch (error) {
    console.error('Failed to set current plan:', error);
    
    // Show error notification
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.style.backgroundColor = 'var(--danger-color)';
    notification.textContent = translate('set_current_plan_error', { error: error.message }) || `Failed to set current plan: ${error.message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 5000);
  } finally {
    // Remove loading state
    setActivePlanBtn.classList.remove('loading');
    updateSetCurrentPlanButton(); // Re-evaluate button state
  }
}

// Fixed syncPlanSelector function
function syncPlanSelector() {
  if (!planSelector || !currentPlan) return;
  
  // Ensure plan selector selects correct plan
  if (planSelector.value !== currentPlan) {
    planSelector.value = currentPlan;
    console.log(`Plan selector synchronized to: ${currentPlan}`);
  }
  
  // Trigger button state update
  updateSetCurrentPlanButton();
  
  // Update plan header display
  updatePlanHeader();
  
  // Re-render selector to update star display
  renderPlanSelector();
}

/*
INTEGRATION INSTRUCTIONS:

1. In the original script.js file, replace these functions with the fixed versions above:
   - renderPlanSelector
   - updateSetActivePlanButton → updateSetCurrentPlanButton
   - updatePlanHeader  
   - setActivePlan → setCurrentPlan
   - syncPlanSelector

2. Update the event listeners:
   - Change setActivePlan to setCurrentPlan in addEventListener
   - Change updateSetActivePlanButton to updateSetCurrentPlanButton in all calls

3. Update global window assignments at the bottom:
   - Change window.setActivePlan to window.setCurrentPlan
   - Change window.updateSetActivePlanButton to window.updateSetCurrentPlanButton

4. Update the HTML button onclick if it's hardcoded:
   - Change onclick="setActivePlan()" to onclick="setCurrentPlan()"

The key insight is that the backend doesn't have an "active plan" concept - it only has a "current plan" concept. The star should indicate which plan is currently selected/being worked on, not some non-existent "active" flag.
*/
