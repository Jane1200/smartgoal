import Finance from '../models/Finance.js';
import Goal from '../models/Goal.js';

/**
 * Generate smart goal recommendations for users aged 18-45
 * Adapts based on age and occupation (student vs professional)
 */
export async function generateGoalRecommendations(userId) {
  try {
    console.log(`🤖 Generating goal recommendations for user: ${userId}`);

    // Fetch user profile to get age and occupation
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId).lean();
    
    const userAge = user?.age || 25; // Default to 25 if not set
    const userOccupation = user?.occupation || 'working_professional'; // Default
    
    console.log(`👤 User Profile: Age ${userAge}, Occupation: ${userOccupation}`);

    // Fetch user's financial data
    const [incomeEntries, expenseEntries, existingGoals] = await Promise.all([
      Finance.find({ userId, type: 'income' }).lean(),
      Finance.find({ userId, type: 'expense' }).lean(),
      Goal.find({ userId, status: { $nin: ['completed', 'archived'] } }).lean()
    ]);

    // Calculate financial metrics
    const totalIncome = incomeEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpenses = expenseEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalSavings = totalIncome - totalExpenses;

    // Calculate monthly averages (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentIncome = incomeEntries
      .filter(e => new Date(e.date) >= thirtyDaysAgo)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const recentExpenses = expenseEntries
      .filter(e => new Date(e.date) >= thirtyDaysAgo)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const monthlyIncome = recentIncome;
    const monthlyExpenses = recentExpenses;
    const monthlySavings = monthlyIncome - monthlyExpenses;

    // Analyze spending by category
    const expensesByCategory = {};
    expenseEntries.forEach(e => {
      const category = e.category || 'other';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + (e.amount || 0);
    });

    // Check existing goal categories
    const existingGoalCategories = new Set(existingGoals.map(g => g.category));

    console.log(`📊 Financial Summary:
      - Monthly Income: ₹${monthlyIncome}
      - Monthly Expenses: ₹${monthlyExpenses}
      - Monthly Savings: ₹${monthlySavings}
      - Total Savings: ₹${totalSavings}
      - Existing Goals: ${existingGoals.length}
    `);

    const recommendations = [];

    // Determine user segment for personalized recommendations
    const isStudent = userOccupation === 'student';
    const isYoungProfessional = userAge <= 30 && !isStudent;
    const isMidCareer = userAge > 30 && userAge <= 40;
    const isEstablished = userAge > 40;

    console.log(`📊 User Segment: ${isStudent ? 'Student' : isYoungProfessional ? 'Young Professional' : isMidCareer ? 'Mid-Career' : 'Established Professional'}`);

    // 1. Emergency Fund (Scaled by age and income)
    if (!existingGoalCategories.has('emergency_fund') && monthlyExpenses > 0) {
      let emergencyFundTarget;
      let monthsOfExpenses;
      
      if (isStudent) {
        // Students: 1 month of expenses or ₹5,000 minimum
        monthsOfExpenses = 1;
        emergencyFundTarget = Math.max(5000, Math.min(monthlyExpenses, 10000));
      } else if (isYoungProfessional) {
        // Young professionals: 1.5-2 months
        monthsOfExpenses = 1.5;
        emergencyFundTarget = Math.max(10000, Math.min(monthlyExpenses * 1.5, 25000));
      } else if (isMidCareer) {
        // Mid-career: 2-3 months
        monthsOfExpenses = 2.5;
        emergencyFundTarget = Math.max(20000, Math.min(monthlyExpenses * 2.5, 50000));
      } else {
        // Established: 3-4 months
        monthsOfExpenses = 3;
        emergencyFundTarget = Math.max(30000, Math.min(monthlyExpenses * 3, 75000));
      }
      
      // Calculate realistic monthly contribution based on savings
      let monthlyContribution;
      if (isStudent) {
        // Students: ₹200-500/month is realistic
        monthlyContribution = Math.max(200, Math.min(monthlySavings * 0.5, 500));
      } else if (isYoungProfessional) {
        // Young professionals: ₹500-1500/month
        monthlyContribution = Math.max(500, Math.min(monthlySavings * 0.6, 1500));
      } else {
        // Mid-career and above: ₹1000-3000/month
        monthlyContribution = Math.max(1000, Math.min(monthlySavings * 0.6, 3000));
      }
      
      const monthsToSave = monthlyContribution > 0 ? Math.ceil(emergencyFundTarget / monthlyContribution) : 12;
      
      recommendations.push({
        type: 'emergency_fund',
        title: isStudent ? 'Emergency Fund (Starter)' : `Emergency Fund (${monthsOfExpenses} months)`,
        description: isStudent 
          ? 'Build a small safety net for unexpected expenses like medical emergencies, laptop repairs, or urgent travel. Start with ₹5,000-10,000.'
          : `Build a safety net covering ${monthsOfExpenses} months of expenses for emergencies like job loss, medical issues, or unexpected repairs.`,
        targetAmount: Math.round(emergencyFundTarget),
        priority: 1,
        category: 'emergency_fund',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, isStudent ? 24 : 12),
        reasoning: isStudent
          ? `As a student, having ₹${emergencyFundTarget.toLocaleString()} saved can help you handle unexpected situations.`
          : `With ${monthsOfExpenses} months of expenses (₹${emergencyFundTarget.toLocaleString()}), you'll have peace of mind.`,
        impact: 'high',
        confidence: 95,
        ageAppropriate: true
      });
    }

    // 2. Laptop/Phone Upgrade (More relevant for students and young professionals)
    if ((isStudent || isYoungProfessional) && !existingGoalCategories.has('essential_purchase') && monthlySavings > 0) {
      const deviceTarget = isStudent ? 30000 : 40000;
      const monthlyContribution = isStudent 
        ? Math.max(300, Math.min(monthlySavings * 0.4, 600))  // Students: ₹300-600/month
        : Math.max(1000, Math.min(monthlySavings * 0.4, 2000)); // Professionals: ₹1000-2000/month
      const monthsToSave = Math.ceil(deviceTarget / monthlyContribution);
      
      recommendations.push({
        type: 'essential_purchase',
        title: isStudent ? 'Laptop for Studies' : 'Laptop/Phone Upgrade',
        description: isStudent
          ? 'Save for a laptop essential for your studies and assignments. A good device improves productivity and learning.'
          : 'Upgrade your work laptop or smartphone. Quality tech is an investment in your career and productivity.',
        targetAmount: deviceTarget,
        priority: 2,
        category: 'essential_purchase',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, isStudent ? 36 : 24),
        reasoning: `Technology is crucial for ${isStudent ? 'students' : 'professionals'}. Save ₹${deviceTarget.toLocaleString()} for a quality device.`,
        impact: 'high',
        confidence: 90,
        ageAppropriate: true
      });
    }

    // 3. Education/Skill Development (Scaled by career stage)
    if (!existingGoalCategories.has('education') && monthlySavings > 0) {
      let courseTarget, courseDescription, monthlyContribution;
      
      if (isStudent) {
        courseTarget = 5000;
        courseDescription = 'Save for online courses on Udemy, Coursera to learn new skills and boost your resume.';
        monthlyContribution = Math.max(200, Math.min(monthlySavings * 0.3, 400)); // ₹200-400/month
      } else if (isYoungProfessional) {
        courseTarget = 10000;
        courseDescription = 'Invest in professional certifications or advanced courses to accelerate your career growth.';
        monthlyContribution = Math.max(500, Math.min(monthlySavings * 0.3, 1000)); // ₹500-1000/month
      } else if (isMidCareer) {
        courseTarget = 20000;
        courseDescription = 'Save for executive education, MBA courses, or specialized certifications to advance to leadership roles.';
        monthlyContribution = Math.max(1000, Math.min(monthlySavings * 0.3, 2000)); // ₹1000-2000/month
      } else {
        courseTarget = 25000;
        courseDescription = 'Invest in executive programs, industry conferences, or mentorship programs to stay ahead.';
        monthlyContribution = Math.max(1500, Math.min(monthlySavings * 0.3, 3000)); // ₹1500-3000/month
      }
      
      const monthsToSave = Math.ceil(courseTarget / monthlyContribution);
      
      recommendations.push({
        type: 'education',
        title: isStudent ? 'Online Course Fund' : isMidCareer ? 'Executive Education' : 'Professional Development',
        description: courseDescription,
        targetAmount: courseTarget,
        priority: 2,
        category: 'education',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, isStudent ? 18 : 12),
        reasoning: `Continuous learning is key to career growth. ₹${courseTarget.toLocaleString()} can significantly boost your skills.`,
        impact: 'high',
        confidence: 85,
        ageAppropriate: true
      });
    }

    // 4. Vacation/Trip (Scaled by age and income)
    if (monthlySavings > 200 && !existingGoalCategories.has('discretionary')) {
      let tripTarget, tripDescription, tripTitle, monthlyContribution;
      
      if (isStudent) {
        tripTarget = 10000;
        tripTitle = 'Weekend Trip with Friends';
        tripDescription = 'Plan a fun weekend trip with friends! Goa, Manali, or Rishikesh - ₹10,000 covers travel, stay, and food for 2-3 days.';
        monthlyContribution = Math.max(250, Math.min(monthlySavings * 0.25, 500)); // ₹250-500/month
      } else if (isYoungProfessional) {
        tripTarget = 20000;
        tripTitle = 'Week-Long Vacation';
        tripDescription = 'Take a well-deserved break! Save for a week-long vacation to explore new places and recharge.';
        monthlyContribution = Math.max(500, Math.min(monthlySavings * 0.25, 1000)); // ₹500-1000/month
      } else if (isMidCareer) {
        tripTarget = 40000;
        tripTitle = 'Family Vacation';
        tripDescription = 'Plan a memorable family vacation. Whether domestic or international, create lasting memories with loved ones.';
        monthlyContribution = Math.max(1000, Math.min(monthlySavings * 0.25, 2000)); // ₹1000-2000/month
      } else {
        tripTarget = 60000;
        tripTitle = 'International Trip';
        tripDescription = 'Explore the world! Save for an international vacation to destinations you\'ve always dreamed of visiting.';
        monthlyContribution = Math.max(1500, Math.min(monthlySavings * 0.25, 3000)); // ₹1500-3000/month
      }
      
      const monthsToSave = Math.ceil(tripTarget / monthlyContribution);
      
      recommendations.push({
        type: 'discretionary',
        title: tripTitle,
        description: tripDescription,
        targetAmount: tripTarget,
        priority: 3,
        category: 'discretionary',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, isStudent ? 24 : 12),
        reasoning: `You deserve a break! ${isStudent ? 'A weekend trip' : isYoungProfessional ? 'A vacation' : 'A family trip'} costs around ₹${tripTarget.toLocaleString()}.`,
        impact: 'medium',
        confidence: 80,
        ageAppropriate: true
      });
    }

    // 5. Vehicle Goal (Scaled by age and income)
    if (monthlyIncome > 15000 && !existingGoalCategories.has('essential_purchase')) {
      let vehicleTarget, vehicleTitle, vehicleDescription, monthlyContribution;
      
      if (isStudent || isYoungProfessional) {
        vehicleTarget = 25000;
        vehicleTitle = 'Bike/Scooter Down Payment';
        vehicleDescription = 'Save for a two-wheeler down payment to make your daily commute easier. Freedom and convenience!';
        monthlyContribution = isStudent 
          ? Math.max(400, Math.min(monthlySavings * 0.5, 800))   // Students: ₹400-800/month
          : Math.max(1000, Math.min(monthlySavings * 0.5, 2000)); // Young prof: ₹1000-2000/month
      } else if (isMidCareer) {
        vehicleTarget = 100000;
        vehicleTitle = 'Car Down Payment';
        vehicleDescription = 'Save for a car down payment. A family car provides comfort, safety, and convenience for daily needs.';
        monthlyContribution = Math.max(2000, Math.min(monthlySavings * 0.5, 5000)); // ₹2000-5000/month
      } else {
        vehicleTarget = 200000;
        vehicleTitle = 'Car Upgrade Fund';
        vehicleDescription = 'Upgrade to a better car. You\'ve earned it! Save for a down payment on your dream vehicle.';
        monthlyContribution = Math.max(3000, Math.min(monthlySavings * 0.5, 8000)); // ₹3000-8000/month
      }
      
      const monthsToSave = Math.ceil(vehicleTarget / monthlyContribution);
      
      recommendations.push({
        type: 'essential_purchase',
        title: vehicleTitle,
        description: vehicleDescription,
        targetAmount: vehicleTarget,
        priority: 2,
        category: 'essential_purchase',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, isStudent ? 36 : 24),
        reasoning: `Having your own vehicle improves mobility. ₹${vehicleTarget.toLocaleString()} is a good ${isStudent || isYoungProfessional ? 'bike/scooter' : 'car'} down payment.`,
        impact: 'high',
        confidence: 85,
        ageAppropriate: true
      });
    }

    // 6. Gym/Fitness Membership (Health goal)
    if (monthlySavings > 200 && expensesByCategory['healthcare'] < monthlyIncome * 0.05) {
      const gymTarget = 6000; // 6-month gym membership
      const monthlyContribution = isStudent 
        ? Math.max(200, Math.min(monthlySavings * 0.2, 400))  // Students: ₹200-400/month
        : Math.max(500, Math.min(monthlySavings * 0.2, 1000)); // Others: ₹500-1000/month
      const monthsToSave = Math.ceil(gymTarget / monthlyContribution);
      
      recommendations.push({
        type: 'discretionary',
        title: 'Gym/Fitness Membership',
        description: 'Invest in your health! Save for a 6-month gym membership or fitness classes. Staying fit improves productivity and mental health.',
        targetAmount: gymTarget,
        priority: 3,
        category: 'discretionary',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, isStudent ? 18 : 12),
        reasoning: 'Health is wealth! A gym membership costs around ₹1,000/month. Start with a 6-month goal.',
        impact: 'medium',
        confidence: 75,
        studentFriendly: true
      });
    }

    // 7. New Wardrobe/Professional Clothes (For interviews/work)
    if (monthlyIncome > 5000 && !existingGoalCategories.has('discretionary')) {
      const wardrobeTarget = 8000; // Professional wardrobe
      const monthlyContribution = isStudent 
        ? Math.max(200, Math.min(monthlySavings * 0.2, 400))  // Students: ₹200-400/month
        : Math.max(500, Math.min(monthlySavings * 0.2, 1000)); // Others: ₹500-1000/month
      const monthsToSave = Math.ceil(wardrobeTarget / monthlyContribution);
      
      recommendations.push({
        type: 'discretionary',
        title: 'Professional Wardrobe',
        description: 'Build a professional wardrobe for interviews, internships, or your first job. Good clothes boost confidence and make a great first impression.',
        targetAmount: wardrobeTarget,
        priority: 3,
        category: 'discretionary',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, isStudent ? 18 : 12),
        reasoning: 'Dressing professionally matters! ₹8,000 can get you 2-3 good formal outfits.',
        impact: 'medium',
        confidence: 70,
        studentFriendly: true
      });
    }

    // 8. Concert/Event Tickets (Entertainment)
    if (monthlySavings > 200 && expensesByCategory['entertainment'] > 0) {
      const eventTarget = 5000; // Concert or event tickets
      const monthlyContribution = isStudent 
        ? Math.max(150, Math.min(monthlySavings * 0.15, 300))  // Students: ₹150-300/month
        : Math.max(300, Math.min(monthlySavings * 0.15, 600)); // Others: ₹300-600/month
      const monthsToSave = Math.ceil(eventTarget / monthlyContribution);
      
      recommendations.push({
        type: 'discretionary',
        title: 'Concert/Event Fund',
        description: 'Save for your favorite artist\'s concert, music festival, or sporting event. Create unforgettable experiences with friends!',
        targetAmount: eventTarget,
        priority: 4,
        category: 'discretionary',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, isStudent ? 18 : 12),
        reasoning: 'Live events create amazing memories! Concert tickets typically cost ₹3,000-5,000.',
        impact: 'low',
        confidence: 70,
        studentFriendly: true
      });
    }

    // 9. Gaming Console/Setup (For gamers)
    if (monthlyIncome > 10000 && expensesByCategory['entertainment'] > monthlyIncome * 0.1) {
      const gamingTarget = 30000; // PS5/Xbox or gaming PC upgrade
      const monthlyContribution = isStudent 
        ? Math.max(400, Math.min(monthlySavings * 0.3, 700))   // Students: ₹400-700/month
        : Math.max(1000, Math.min(monthlySavings * 0.3, 2000)); // Others: ₹1000-2000/month
      const monthsToSave = Math.ceil(gamingTarget / monthlyContribution);
      
      recommendations.push({
        type: 'discretionary',
        title: 'Gaming Console/Setup',
        description: 'Save for a PlayStation 5, Xbox, or upgrade your gaming PC. Gaming is a great way to unwind and connect with friends online.',
        targetAmount: gamingTarget,
        priority: 4,
        category: 'discretionary',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, isStudent ? 36 : 18),
        reasoning: 'You spend on entertainment already. ₹30,000 gets you a next-gen console or PC upgrade.',
        impact: 'low',
        confidence: 65,
        studentFriendly: true
      });
    }

    // 10. First Salary Celebration Fund (For students about to graduate)
    if (monthlyIncome < 20000 && monthlySavings > 0) {
      const celebrationTarget = 5000;
      const monthlyContribution = Math.max(150, Math.min(monthlySavings * 0.2, 400)); // ₹150-400/month
      const monthsToSave = Math.ceil(celebrationTarget / monthlyContribution);
      
      recommendations.push({
        type: 'discretionary',
        title: 'First Salary Celebration',
        description: 'Planning to start working soon? Save ₹5,000 to celebrate your first salary with family or friends. It\'s a milestone worth celebrating!',
        targetAmount: celebrationTarget,
        priority: 4,
        category: 'discretionary',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, 18),
        reasoning: 'Your first salary is special! Having ₹5,000 saved lets you celebrate without guilt.',
        impact: 'low',
        confidence: 70,
        studentFriendly: true
      });
    }

    // 11. Investment Start (Scaled by age and income)
    if (monthlyIncome > 15000 && monthlySavings > 1000 && !existingGoalCategories.has('investment')) {
      let investmentTarget, investmentDescription, monthlyContribution;
      
      if (isStudent || isYoungProfessional) {
        investmentTarget = 10000;
        investmentDescription = 'Begin your investment journey! Save ₹10,000 to start a SIP in mutual funds. Start small, grow big!';
        monthlyContribution = isStudent 
          ? Math.max(300, Math.min(monthlySavings * 0.3, 600))   // Students: ₹300-600/month
          : Math.max(1000, Math.min(monthlySavings * 0.3, 2000)); // Young prof: ₹1000-2000/month
      } else if (isMidCareer) {
        investmentTarget = 50000;
        investmentDescription = 'Build wealth through investments. Save ₹50,000 for mutual funds, stocks, or other investment vehicles.';
        monthlyContribution = Math.max(2000, Math.min(monthlySavings * 0.3, 5000)); // ₹2000-5000/month
      } else {
        investmentTarget = 100000;
        investmentDescription = 'Diversify your portfolio. Save ₹1 lakh for strategic investments in stocks, bonds, or real estate.';
        monthlyContribution = Math.max(3000, Math.min(monthlySavings * 0.3, 8000)); // ₹3000-8000/month
      }
      
      const monthsToSave = Math.ceil(investmentTarget / monthlyContribution);
      
      recommendations.push({
        type: 'investment',
        title: isStudent || isYoungProfessional ? 'Start Investing (SIP)' : isMidCareer ? 'Investment Portfolio' : 'Wealth Building Fund',
        description: investmentDescription,
        targetAmount: investmentTarget,
        priority: 2,
        category: 'investment',
        suggestedMonthlyContribution: Math.round(monthlyContribution),
        durationMonths: Math.min(monthsToSave, isStudent ? 24 : 12),
        reasoning: `Starting ${isStudent || isYoungProfessional ? 'early' : 'now'} with investments gives you ${isStudent || isYoungProfessional ? 'a huge advantage' : 'better returns'}. ₹${investmentTarget.toLocaleString()} is a great start.`,
        impact: 'high',
        confidence: 80,
        ageAppropriate: true
      });
    }

    // Sort recommendations by priority and confidence
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.confidence - a.confidence;
    });

    // Limit to top 6 recommendations (students don't need too many)
    const topRecommendations = recommendations.slice(0, 6);

    console.log(`✅ Generated ${topRecommendations.length} student-friendly recommendations`);

    return {
      recommendations: topRecommendations,
      financialSummary: {
        monthlyIncome,
        monthlyExpenses,
        monthlySavings,
        totalSavings,
        savingsRate: monthlyIncome > 0 ? Math.round((monthlySavings / monthlyIncome) * 100) : 0
      },
      insights: generateAgeAppropriateInsights(monthlyIncome, monthlyExpenses, monthlySavings, existingGoals, expensesByCategory, userAge, userOccupation)
    };
  } catch (error) {
    console.error('❌ Error generating goal recommendations:', error);
    throw error;
  }
}

/**
 * Generate financial insights based on age and occupation
 */
function generateAgeAppropriateInsights(monthlyIncome, monthlyExpenses, monthlySavings, existingGoals, expensesByCategory, userAge, userOccupation) {
  const insights = [];
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
  
  const isStudent = userOccupation === 'student';
  const isYoungProfessional = userAge <= 30 && !isStudent;
  const isMidCareer = userAge > 30 && userAge <= 40;

  // Income level insights (age-appropriate)
  if (monthlyIncome === 0) {
    if (isStudent) {
      insights.push({
        type: 'info',
        icon: '🎓',
        message: 'No income yet? Consider part-time work, internships, or freelancing to start earning and building financial habits!'
      });
    } else {
      insights.push({
        type: 'warning',
        icon: '💼',
        message: 'No income recorded. Focus on finding employment or freelance opportunities to start your financial journey.'
      });
    }
  } else if (monthlyIncome < 15000) {
    if (isStudent) {
      insights.push({
        type: 'positive',
        icon: '🎓',
        message: `You're earning ₹${monthlyIncome.toLocaleString()}/month as a student! Focus on building skills and saving small amounts regularly.`
      });
    } else {
      insights.push({
        type: 'info',
        icon: '💪',
        message: `Your income is ₹${monthlyIncome.toLocaleString()}/month. Look for opportunities to increase earnings through upskilling or side projects.`
      });
    }
  } else if (monthlyIncome < 30000) {
    insights.push({
      type: 'positive',
      icon: '👍',
      message: `Good! You're earning ₹${monthlyIncome.toLocaleString()}/month. Try to save at least 20% for your future goals.`
    });
  } else if (monthlyIncome < 50000) {
    insights.push({
      type: 'positive',
      icon: '🌟',
      message: `Excellent! With ₹${monthlyIncome.toLocaleString()}/month, you're doing well. Focus on increasing your savings rate to 30%+.`
    });
  } else {
    insights.push({
      type: 'positive',
      icon: '🚀',
      message: `Outstanding! ₹${monthlyIncome.toLocaleString()}/month puts you in the top tier. Consider aggressive investing and wealth building.`
    });
  }

  // Savings rate insights (age-adjusted expectations)
  const targetSavingsRate = isStudent ? 15 : isYoungProfessional ? 20 : isMidCareer ? 25 : 30;
  
  if (savingsRate >= targetSavingsRate + 10) {
    insights.push({
      type: 'positive',
      icon: '🎯',
      message: `Amazing! You're saving ${savingsRate.toFixed(0)}% of your income. You're building excellent financial habits!`
    });
  } else if (savingsRate >= targetSavingsRate) {
    insights.push({
      type: 'positive',
      icon: '✅',
      message: `Great job! Saving ${savingsRate.toFixed(0)}% is right on target for your age. Keep it up!`
    });
  } else if (savingsRate >= targetSavingsRate - 10) {
    insights.push({
      type: 'info',
      icon: '📊',
      message: `You're saving ${savingsRate.toFixed(0)}%. Try to reach ${targetSavingsRate}% to stay on track with your age group.`
    });
  } else if (savingsRate > 0) {
    insights.push({
      type: 'warning',
      icon: '💡',
      message: `Your savings rate is ${savingsRate.toFixed(0)}%. Aim for ${targetSavingsRate}% to build a strong financial foundation.`
    });
  } else {
    insights.push({
      type: 'critical',
      icon: '⚠️',
      message: 'You\'re spending more than you earn. Review your expenses urgently and create a budget.'
    });
  }

  // Food delivery insight (common for all ages)
  const foodSpending = expensesByCategory['food'] || 0;
  if (foodSpending > monthlyIncome * 0.25) {
    const potentialSavings = Math.round(foodSpending * 0.3);
    insights.push({
      type: 'warning',
      icon: '🍕',
      message: `Food costs ₹${foodSpending.toLocaleString()}/month (${Math.round((foodSpending/monthlyIncome)*100)}%). Cooking at home can save ₹${potentialSavings.toLocaleString()}/month!`
    });
  }

  // Entertainment spending (age-appropriate advice)
  const entertainmentSpending = expensesByCategory['entertainment'] || 0;
  if (entertainmentSpending > monthlyIncome * 0.15) {
    if (isStudent || isYoungProfessional) {
      insights.push({
        type: 'info',
        icon: '🎮',
        message: `Entertainment: ₹${entertainmentSpending.toLocaleString()}/month. Balance fun with savings - your future self will thank you!`
      });
    } else {
      insights.push({
        type: 'warning',
        icon: '🎭',
        message: `Entertainment spending is high at ₹${entertainmentSpending.toLocaleString()}/month. Consider reducing to boost savings.`
      });
    }
  }

  // Goal progress insights
  if (existingGoals.length === 0) {
    insights.push({
      type: 'info',
      icon: '🎯',
      message: isStudent 
        ? 'Start your financial journey by setting your first goal! Even small goals build great habits.'
        : 'Set your first financial goal today! Having clear targets helps you stay motivated and focused.'
    });
  } else if (existingGoals.length >= 4) {
    insights.push({
      type: 'info',
      icon: '🏆',
      message: `You have ${existingGoals.length} active goals. Focus on completing high-priority ones first to avoid spreading yourself too thin.`
    });
  }

  // Age-specific motivational insights
  if (monthlyIncome > 0 && savingsRate > 0) {
    if (isStudent) {
      insights.push({
        type: 'positive',
        icon: '🌟',
        message: 'You\'re ahead of 80% of students by tracking finances! This habit will serve you well throughout life.'
      });
    } else if (isYoungProfessional) {
      insights.push({
        type: 'positive',
        icon: '🚀',
        message: 'Starting financial planning in your 20s gives you a 10-15 year advantage. Keep going!'
      });
    } else if (isMidCareer) {
      insights.push({
        type: 'positive',
        icon: '💼',
        message: 'Your 30s are crucial for wealth building. Focus on aggressive saving and smart investing!'
      });
    } else {
      insights.push({
        type: 'positive',
        icon: '🎖️',
        message: 'Your financial discipline is paying off. Focus on wealth preservation and strategic investments.'
      });
    }
  }

  return insights;
}

/**
 * Create a goal from a recommendation
 */
export async function createGoalFromRecommendation(userId, recommendation) {
  try {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + recommendation.durationMonths);

    const goal = new Goal({
      userId,
      title: recommendation.title,
      description: recommendation.description,
      targetAmount: recommendation.targetAmount,
      currentAmount: 0,
      dueDate,
      status: 'planned',
      category: recommendation.category,
      priority: recommendation.priority,
      isAutoSuggested: true
    });

    await goal.save();
    console.log(`✅ Created goal from recommendation: ${recommendation.title}`);
    
    return goal;
  } catch (error) {
    console.error('❌ Error creating goal from recommendation:', error);
    throw error;
  }
}
