import React, { useState } from 'react';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import { AppBar, Toolbar, Typography, Button, Box, Container, Grid, Card, CardContent, CardActions, IconButton, ButtonGroup, Chip, Rating, Avatar, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import InstagramIcon from '@mui/icons-material/Instagram';
import StarIcon from '@mui/icons-material/Star';
import HandshakeIcon from '@mui/icons-material/Handshake';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useNavigate } from 'react-router-dom';

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF5733',
    },
    secondary: {
      main: '#008c73',
    },
    background: {
      default: '#f4f6f8',
    },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#333',
    },
    h4: {
      fontSize: '1.8rem',
      fontWeight: 600,
      color: '#333',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#555',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '50px',
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '50px 50px 10px 10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
      },
    },
  },
});

// Styled component for a more dynamic card design
const StyledCard = styled(Card)(() => ({
  p: 3,
  borderRadius: '20px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-10px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
  },
}));

// Styled component for the icon container
const IconWrapper = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  borderRadius: '50%',
  width: 70,
  height: 70,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
}));


const companyDetails = {
  name: 'Adobiz',
  tagline: 'Empower Your Bangles Wholesale Business with Our All-in-One Platform',
  description: 'Adobiz is a SAAS product multi-tenant solution specifically designed for the bangles wholesale business. We provide comprehensive solutions for wholesale management, billing, invoicing, and supplier entry directly through the app, helping you streamline your operations and grow your business.',
  contact: {
    phone: '+91 98765 43210',
    email: 'contact@adobiz.com',
  },
};

const trialPlans = [
  {
    code: "TRIAL_XS",
    name: "Trial XS",
    pricePaise: 0,
    durationDays: 7,
    userPricing: { max_employees: 2, max_branch: 1, max_customers: 10, max_suppliers: 5, storageMB: 512 },
  },
  {
    code: "TRIAL_S",
    name: "Trial S",
    pricePaise: 0,
    durationDays: 7,
    userPricing: { max_employees: 5, max_branch: 1, max_customers: 20, max_suppliers: 10, storageMB: 1024 },
  },
];

const monthlyPlans = [
  {
    code: "DEFAULT_PLAN_CODE",
    name: "Basic XS",
    pricePaise: 50000,
    durationDays: 30,
    userPricing: { max_employees: 5, max_branch: 1, max_customers: 50, max_suppliers: 20, storageMB: 1024 },
  },
  {
    code: "BASIC_MONTHLY_S",
    name: "Basic S",
    pricePaise: 100000,
    durationDays: 30,
    userPricing: { max_employees: 10, max_branch: 2, max_customers: 100, max_suppliers: 50, storageMB: 2048 },
  },
  {
    code: "BASIC_MONTHLY_M",
    name: "Basic M",
    pricePaise: 200000,
    durationDays: 30,
    userPricing: { max_employees: 20, max_branch: 5, max_customers: 200, max_suppliers: 100, storageMB: 4096 },
  },
  {
    code: "BASIC_MONTHLY_L",
    name: "Basic L",
    pricePaise: 300000,
    durationDays: 30,
    userPricing: { max_employees: 50, max_branch: 10, max_customers: 500, max_suppliers: 200, storageMB: 8192 },
  },
  {
    code: "BASIC_MONTHLY_XL",
    name: "Basic XL",
    pricePaise: 500000,
    durationDays: 30,
    userPricing: { max_employees: 100, max_branch: 20, max_customers: 1000, max_suppliers: 500, storageMB: 16384 },
  },
  {
    code: "BASIC_MONTHLY_XXL",
    name: "Basic XXL",
    pricePaise: 800000,
    durationDays: 30,
    userPricing: { max_employees: 200, max_branch: 50, max_customers: 2000, max_suppliers: 1000, storageMB: 32768 },
  },
  {
    code: "BASIC_MONTHLY_XXXL",
    name: "Basic XXXL",
    pricePaise: 1200000,
    durationDays: 30,
    userPricing: { max_employees: 500, max_branch: 100, max_customers: 5000, max_suppliers: 2000, storageMB: 65536 },
  },
];

const halfYearlyPlans = monthlyPlans.map((plan) => {
  const originalPricePaise = plan.pricePaise * 6;
  const discountedPricePaise = Math.floor(plan.pricePaise * 5);
  const discountPercentage = Math.round(((originalPricePaise - discountedPricePaise) / originalPricePaise) * 100);
  return {
    ...plan,
    code: plan.code.replace("MONTHLY", "HALFYEARLY"),
    name: plan.name.replace("Monthly", "Half-Yearly"),
    pricePaise: discountedPricePaise,
    originalPricePaise,
    durationDays: 182,
    discountPercentage,
  };
});

const yearlyPlans = monthlyPlans.map((plan) => {
  const originalPricePaise = plan.pricePaise * 12;
  const discountedPricePaise = Math.floor(plan.pricePaise * 10);
  const discountPercentage = Math.round(((originalPricePaise - discountedPricePaise) / originalPricePaise) * 100);
  return {
    ...plan,
    code: plan.code.replace("MONTHLY", "YEARLY"),
    name: plan.name.replace("Monthly", "Yearly"),
    pricePaise: discountedPricePaise,
    originalPricePaise,
    durationDays: 365,
    discountPercentage,
  };
});

const allPlans = {
  TRIAL: trialPlans,
  MONTHLY: monthlyPlans,
  HALFYEARLY: halfYearlyPlans,
  YEARLY: yearlyPlans,
};

const features = [
  {
    title: 'Wholesale Management',
    description: 'Streamline your operations with powerful tools for managing stock, suppliers, and orders with ease.',
  },
  {
    title: 'Billing & Invoicing',
    description: 'Create and send professional invoices and manage all your billing seamlessly directly from the app.',
  },
  {
    title: 'Supplier Entry',
    description: 'Effortlessly add new suppliers and their products directly into the system, ensuring your data is always up-to-date.',
  },
  {
    title: 'QR Code Scanning',
    description: 'Our mobile app allows for direct entry of goods by scanning QR codes on the spot, saving time and reducing errors.',
  },
  {
    title: 'Data Security',
    description: 'Your data is secured with advanced encryption and access controls, giving you peace of mind.',
  },
  {
    title: 'User-Friendly Interface',
    description: 'A clean and intuitive interface that makes it easy for you and your team to navigate and manage your business.',
  },
];

const whyUsData = [
    {
        icon: <RocketLaunchIcon sx={{ fontSize: 40 }} />,
        title: 'Instant Setup',
        description: 'Get your business platform up and running in minutes, with no complex installation required.'
    },
    {
        icon: <HandshakeIcon sx={{ fontSize: 40 }} />,
        title: 'Dedicated Support',
        description: 'Our team is available 24/7 to help you with any questions or issues you may have.'
    },
    {
        icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
        title: 'Scalable Growth',
        description: 'From a micro-business to an enterprise, our plans grow with you to meet your needs.'
    }
];

const stats = [
    {
        number: '1000+',
        label: 'Businesses Served'
    },
    {
        number: '500K+',
        label: 'Invoices Generated'
    },
    {
        number: '99%',
        label: 'Customer Satisfaction'
    }
];

const testimonials = [
    {
        name: 'Priya Sharma',
        role: 'Bangle Emporium Owner',
        rating: 5,
        quote: "Adobiz has transformed my business. Billing is faster, and inventory management is a breeze. It's a must-have for any wholesale business!",
        avatar: 'https://placehold.co/100x100/008c73/FFFFFF?text=PS',
    },
    {
        name: 'Rahul Gupta',
        role: 'Wholesale Distributor',
        rating: 4.5,
        quote: "The QR code scanning feature alone has saved me hours. The interface is intuitive, and the customer support is fantastic.",
        avatar: 'https://placehold.co/100x100/FF5733/FFFFFF?text=RG',
    },
    {
        name: 'Anjali Singh',
        role: 'Retail Partner',
        rating: 5,
        quote: "This platform has made collaborating with my suppliers so easy. I can track orders and inventory in real-time. Highly recommended!",
        avatar: 'https://placehold.co/100x100/333/FFFFFF?text=AS',
    },
];

const faq = [
    {
        question: 'What is Adobiz?',
        answer: 'Adobiz is a SAAS product multi-tenant solution specifically designed for the bangles wholesale business. It offers tools for billing, invoicing, inventory management, and more.'
    },
    {
        question: 'How do I get started?',
        answer: 'You can start with our free trial plans to explore the features. Simply click on the "Try for Free" button, and you will be guided through the setup process.'
    },
    {
        question: 'Do you offer custom plans?',
        answer: 'Yes, we do. If your business needs exceed the specifications of our largest plans, please contact our sales team to discuss a custom solution tailored to your requirements.'
    },
    {
        question: 'Is my data secure?',
        answer: 'We prioritize data security. All your data is protected with industry-standard encryption and robust access controls to ensure your information is safe and private.'
    },
    {
        question: 'Can I upgrade or downgrade my plan?',
        answer: 'Yes, you can easily upgrade or downgrade your plan at any time through your account dashboard. The changes will take effect at the beginning of your next billing cycle.'
    }
];

const App = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [activeBillingCycle, setActiveBillingCycle] = useState('MONTHLY');
  const currentPlans = allPlans[activeBillingCycle];
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const visibleCards = isMobile ? 1 : 3;
  const maxSteps = Math.ceil(currentPlans.length / visibleCards);
  const navigate = useNavigate();
  const handleNext = () => {
    setActiveStep((prevActiveStep) => (prevActiveStep + 1) % maxSteps);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => (prevActiveStep - 1 + maxSteps) % maxSteps);
  };

  const formatPrice = (pricePaise) => {
    return `₹${(pricePaise / 100).toLocaleString('en-IN')}`;
  };

  const getFeatureLabel = (key) => {
    switch(key) {
      case 'max_employees': return 'Employees';
      case 'max_branch': return 'Branches';
      case 'max_reseller': return 'Resellers';
      case 'max_customers': return 'Customers';
      case 'max_suppliers': return 'Suppliers';
      case 'storageMB': return 'Storage';
      default: return key;
    }
  };
  
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    console.log("Signup clicked");
    navigate("/signup-company"); 
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ flexGrow: 1, overflowX: 'hidden', backgroundColor: theme.palette.background.default, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Navigation Bar */}
        <AppBar position="static" color="transparent" elevation={0} sx={{ py: 2 }}>
          <Toolbar>
            <Typography variant="h4" component="div" sx={{ flexGrow: 1, fontWeight: 700, color: 'primary.main' }}>
              Adobiz
            </Typography>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3 }}>
              <Button color="inherit" sx={{ color: '#555' }} onClick={() => scrollToSection('home')}>Home</Button>
              <Button color="inherit" sx={{ color: '#555' }} onClick={() => scrollToSection('features')}>Features</Button>
              <Button color="inherit" sx={{ color: '#555' }} onClick={() => scrollToSection('pricing')}>Pricing</Button>
              <Button color="inherit" sx={{ color: '#555' }} onClick={() => scrollToSection('contact')}>Contact</Button>
              <Button variant="contained" color="primary" onClick={handleSignup}>Sign Up</Button>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Hero Section */}
        <Container maxWidth="xl" id="home" sx={{ mt: 5, py: 10, textAlign: 'center' }}>
          <Grid container spacing={4} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h2" gutterBottom>
                {companyDetails.tagline}
              </Typography>
              <Typography variant="body1" sx={{ mt: 2, mb: 4 }}>
                {companyDetails.description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="contained" color="primary" sx={{ py: 1.5, px: 3 }}>Try for Free</Button>
                <Button variant="outlined" sx={{ py: 1.5, px: 3, borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}>Contact Sales</Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
        
        {/* Bangles Imagery */}
        <Container maxWidth="lg" sx={{ textAlign: 'center', my: 8 }}>
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 3,
            }}>
                <Box
                    component="img"
                    sx={{
                        width: '100%',
                        maxWidth: 350,
                        height: 'auto',
                        borderRadius: '50% 50% 0 0',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                    src="https://placehold.co/400x400/FF5733/FFFFFF?text=Bangles+Collection"
                    alt="Bangles Collection"
                />
                <Box
                    component="img"
                    sx={{
                        width: '100%',
                        maxWidth: 350,
                        height: 'auto',
                        borderRadius: '50% 50% 0 0',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                    src="https://placehold.co/400x400/008c73/FFFFFF?text=Bangle+Stock"
                    alt="Bangle Stock"
                />
            </Box>
        </Container>

        {/* Features Section */}
        <Box sx={{ py: 10, backgroundColor: '#fff' }} id="features">
          <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
              Key Features
            </Typography>
            <Grid container spacing={4} sx={{ mt: 4 }} alignItems="stretch">
              {features.map((feature, index) => (
                <Grid item xs={12} sm={6} md={4} key={index} sx={{ display: 'flex' }}>
                  <StyledCard>
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexGrow: 1 }}>
                      <IconWrapper>
                        <CheckCircleIcon sx={{ fontSize: 40 }} />
                      </IconWrapper>
                      <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </StyledCard>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Why Choose Us Section */}
        <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
                Why Choose Adobiz?
            </Typography>
            <Grid container spacing={4} sx={{ mt: 4 }} alignItems="stretch" justifyContent="center">
                {whyUsData.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index} sx={{ display: 'flex' }}>
                        <StyledCard>
                            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexGrow: 1 }}>
                                <IconWrapper>
                                    {item.icon}
                                </IconWrapper>
                                <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
                                    {item.title}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
                                    {item.description}
                                </Typography>
                            </CardContent>
                        </StyledCard>
                    </Grid>
                ))}
            </Grid>
        </Container>

        {/* Our Success in Numbers Section */}
        <Box sx={{ py: 10, backgroundColor: theme.palette.primary.main, color: '#fff' }}>
            <Container maxWidth="md" sx={{ textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom sx={{ color: '#fff' }}>
                    Our Success in Numbers
                </Typography>
                <Grid container spacing={4} sx={{ mt: 4, justifyContent: 'center' }}>
                    {stats.map((stat, index) => (
                        <Grid item xs={12} sm={4} key={index}>
                            <Typography variant="h2" sx={{ fontWeight: 700 }}>
                                {stat.number}
                            </Typography>
                            <Typography variant="h6">
                                {stat.label}
                            </Typography>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
        
        {/* Pricing Slider Section */}
        <Box sx={{ py: 10, backgroundColor: '#fff' }} id="pricing">
            <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom>
                Our Plans
              </Typography>
              <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
                <ButtonGroup variant="contained" aria-label="billing cycle selector">
                  <Button 
                    onClick={() => { setActiveBillingCycle('MONTHLY'); setActiveStep(0); }} 
                    sx={{
                      borderRadius: '25px', 
                      backgroundColor: activeBillingCycle === 'MONTHLY' ? 'primary.main' : '#ddd', 
                      color: activeBillingCycle === 'MONTHLY' ? '#fff' : '#000',
                      '&:hover': {
                        backgroundColor: activeBillingCycle === 'MONTHLY' ? 'primary.dark' : '#ccc',
                      }
                    }}
                  >
                    Monthly
                  </Button>
                  <Button 
                    onClick={() => { setActiveBillingCycle('HALFYEARLY'); setActiveStep(0); }} 
                    sx={{
                      borderRadius: '25px', 
                      backgroundColor: activeBillingCycle === 'HALFYEARLY' ? 'primary.main' : '#ddd', 
                      color: activeBillingCycle === 'HALFYEARLY' ? '#fff' : '#000',
                      '&:hover': {
                        backgroundColor: activeBillingCycle === 'HALFYEARLY' ? 'primary.dark' : '#ccc',
                      }
                    }}
                  >
                    Half-Yearly
                  </Button>
                  <Button 
                    onClick={() => { setActiveBillingCycle('YEARLY'); setActiveStep(0); }} 
                    sx={{
                      borderRadius: '25px', 
                      backgroundColor: activeBillingCycle === 'YEARLY' ? 'primary.main' : '#ddd', 
                      color: activeBillingCycle === 'YEARLY' ? '#fff' : '#000',
                      '&:hover': {
                        backgroundColor: activeBillingCycle === 'YEARLY' ? 'primary.dark' : '#ccc',
                      }
                    }}
                  >
                    Yearly
                  </Button>
                  <Button 
                    onClick={() => { setActiveBillingCycle('TRIAL'); setActiveStep(0); }} 
                    sx={{
                      borderRadius: '25px', 
                      backgroundColor: activeBillingCycle === 'TRIAL' ? 'secondary.main' : '#ddd', 
                      color: activeBillingCycle === 'TRIAL' ? '#fff' : '#000',
                      '&:hover': {
                        backgroundColor: activeBillingCycle === 'TRIAL' ? 'secondary.dark' : '#ccc',
                      }
                    }}
                  >
                    Trial
                  </Button>
                </ButtonGroup>
              </Box>
              
              <Box sx={{ position: 'relative', mt: 4, overflow: 'hidden' }}>
                <IconButton onClick={handleBack} sx={{ position: 'absolute', left: { xs: 0, md: -50 }, top: '50%', transform: 'translateY(-50%)' }}>
                  <ArrowBackIosIcon />
                </IconButton>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'flex-start',
                  transition: 'transform 0.5s ease-in-out',
                  transform: `translateX(-${activeStep * (100 / visibleCards)}%)`,
                  width: `${currentPlans.length / visibleCards * 100}%`,
                }}>
                  {currentPlans.map((plan, index) => (
                    <Card 
                      key={plan.code} 
                      sx={{ 
                        width: '100%',
                        maxWidth: 400,
                        flexShrink: 0,
                        mx: 2, 
                        py: 3,
                        position: 'relative',
                        transition: 'transform 0.3s ease-in-out, border 0.3s ease-in-out',
                        transform: `scale(${index >= activeStep * visibleCards && index < (activeStep + 1) * visibleCards ? 1.05 : 1})`,
                        border: index === activeStep * visibleCards ? `3px solid ${theme.palette.primary.main}` : `3px solid transparent`,
                      }}
                    >
                      {plan.discountPercentage > 0 && (
                        <Chip 
                          label={`Save ${plan.discountPercentage}%`} 
                          color="secondary"
                          sx={{
                            position: 'absolute',
                            top: 15,
                            right: 15,
                            fontWeight: 'bold',
                            color: '#fff',
                          }}
                        />
                      )}
                      <CardContent sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {plan.name}
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          {plan.originalPricePaise && (
                            <Typography variant="body2" sx={{ textDecoration: 'line-through', color: '#888' }}>
                              {formatPrice(plan.originalPricePaise)}
                            </Typography>
                          )}
                          <Typography variant="h3" sx={{ fontWeight: 700 }}>
                            {formatPrice(plan.pricePaise)}
                            {plan.pricePaise > 0 && <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#666' }}>/{plan.durationDays > 30 ? 'year' : 'month'}</span>}
                          </Typography>
                        </Box>
                        <Box sx={{ mt: 3, px: 2, textAlign: 'left' }}>
                          {Object.keys(plan.userPricing).map((key, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                              <CheckCircleIcon color="secondary" sx={{ mr: 1, fontSize: 18 }} />
                              <Typography variant="body1">
                                {getFeatureLabel(key)}: {
                                  key === 'storageMB' 
                                    ? `${plan.userPricing[key] / 1024} GB` 
                                    : plan.userPricing[key]
                                }
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'center', pb: 4 }}>
                        <Button variant="contained" color="primary" sx={{ py: 1.5, px: 4 }}>
                          Choose Plan
                        </Button>
                      </CardActions>
                    </Card>
                  ))}
                </Box>
                <IconButton onClick={handleNext} sx={{ position: 'absolute', right: { xs: 0, md: -50 }, top: '50%', transform: 'translateY(-50%)' }}>
                  <ArrowForwardIosIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
                {[...Array(maxSteps)].map((_, step) => (
                  <Box
                    key={step}
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: step === activeStep ? theme.palette.primary.main : theme.palette.grey[400],
                      cursor: 'pointer',
                      transition: 'background-color 0.3s ease-in-out',
                    }}
                    onClick={() => setActiveStep(step)}
                  />
                ))}
              </Box>
            </Container>
        </Box>

        {/* Testimonials Section */}
        <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
                What Our Customers Say
            </Typography>
            <Grid container spacing={4} sx={{ mt: 4, justifyContent: 'center' }}>
                {testimonials.map((testimonial, index) => (
                    <Grid item xs={12} md={4} key={index}>
                        <Card sx={{ p: 3, borderRadius: '20px', boxShadow: 6 }}>
                            <CardContent>
                                <Rating value={testimonial.rating} readOnly emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />} />
                                <Typography variant="body1" sx={{ mt: 2, fontStyle: 'italic', color: '#666' }}>
                                    "{testimonial.quote}"
                                </Typography>
                                <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Avatar src={testimonial.avatar} sx={{ mr: 2, width: 60, height: 60 }} />
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                            {testimonial.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {testimonial.role}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>

        {/* FAQ Section */}
        <Container maxWidth="lg" sx={{ py: 10, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
                Frequently Asked Questions
            </Typography>
            <Box sx={{ mt: 4, width: '100%' }}>
                {faq.map((item, index) => (
                    <Accordion key={index} sx={{ my: 1, boxShadow: 3, borderRadius: '10px' }}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls={`panel${index}-content`}
                            id={`panel${index}-header`}
                            sx={{ backgroundColor: '#fff', borderRadius: '10px' }}
                        >
                            <Typography variant="h6" sx={{ color: theme.palette.primary.main }}>{item.question}</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ textAlign: 'left', backgroundColor: '#f9f9f9' }}>
                            <Typography>
                                {item.answer}
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>
        </Container>
        
        {/* Footer */}
        <Box component="footer" id="contact" sx={{ py: 5, backgroundColor: '#333', color: '#fff', mt: 'auto' }}>
          <Container maxWidth="lg">
            <Grid container spacing={4} justifyContent="center" sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Adobiz
                </Typography>
                <Typography variant="body2">
                  {companyDetails.description}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Contact Us
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  <PhoneIcon sx={{ mr: 1 }} />
                  <Typography variant="body2">{companyDetails.contact.phone}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  <EmailIcon sx={{ mr: 1 }} />
                  <Typography variant="body2">{companyDetails.contact.email}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Follow Us
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  <IconButton color="inherit">
                    <FacebookIcon />
                  </IconButton>
                  <IconButton color="inherit">
                    <TwitterIcon />
                  </IconButton>
                  <IconButton color="inherit">
                    <LinkedInIcon />
                  </IconButton>
                  <IconButton color="inherit">
                    <InstagramIcon />
                  </IconButton>
                </Box>
              </Grid>
            </Grid>
            <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid #555', textAlign: 'center' }}>
              <Typography variant="body2">
                © {new Date().getFullYear()} Adobiz. All Rights Reserved.
              </Typography>
            </Box>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
