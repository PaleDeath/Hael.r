import React from 'react';

interface CrisisResourcesProps {
  severity: 'moderate' | 'high';
  category: string;
}

const CrisisResources: React.FC<CrisisResourcesProps> = ({ severity, category }) => {
  const isHighSeverity = severity === 'high';
  
  const getCategorySpecificResources = () => {
    switch (category) {
      case 'depression':
        return {
          title: isHighSeverity ? 'Depression Crisis Resources (India)' : 'Depression Support Resources (India)',
          resources: [
            {
              name: 'AASRA',
              contact: '91-9820466726',
              description: '24/7 helpline for those experiencing suicidal thoughts',
              website: 'http://www.aasra.info/'
            },
            {
              name: 'iCall',
              contact: '+91 9152987821',
              description: 'Psychosocial helpline by TISS offering counseling services',
              website: 'https://icallhelpline.org/'
            },
            {
              name: 'Vandrevala Foundation',
              contact: '1860-2662-345 / +91 9999666555',
              description: '24/7 helpline for mental health emergencies',
              website: 'https://www.vandrevalafoundation.com/'
            }
          ]
        };
      case 'anxiety':
        return {
          title: isHighSeverity ? 'Anxiety Crisis Resources (India)' : 'Anxiety Support Resources (India)',
          resources: [
            {
              name: 'The Mind Research Foundation',
              contact: '+91-9035688809',
              description: 'Provides mental health support and research in India',
              website: 'https://mindresearchfoundation.com/'
            },
            {
              name: 'NIMHANS',
              contact: '080-26995100 / 080-26995200',
              description: 'National Institute of Mental Health and Neurosciences, Bangalore',
              website: 'https://nimhans.ac.in/'
            },
            {
              name: 'MPower Minds',
              contact: '+91 9702011980',
              description: 'Mental health counseling and therapy support',
              website: 'https://mpowerminds.com/'
            }
          ]
        };
      case 'stress':
        return {
          title: isHighSeverity ? 'Stress Crisis Resources (India)' : 'Stress Support Resources (India)',
          resources: [
            {
              name: 'Parivarthan',
              contact: '+91 7676602602',
              description: 'Counseling helpline for emotional distress and relationship issues',
              website: 'https://parivarthan.org/'
            },
            {
              name: 'COOJ Mental Health Foundation',
              contact: '0832-2252525',
              description: 'Mental health support with focus on stress management',
              website: 'http://www.cooj.co.in/'
            },
            {
              name: 'Mann Talks',
              contact: '+91 86861 39139',
              description: 'Mental wellness platform offering on-demand professional counseling',
              website: 'https://www.manntalks.org/'
            }
          ]
        };
      case 'sleep':
        return {
          title: isHighSeverity ? 'Sleep Issues Resources (India)' : 'Sleep Support Resources (India)',
          resources: [
            {
              name: 'Indian Sleep Disorders Association',
              contact: 'Contact via website',
              description: 'Professional organization focused on sleep health',
              website: 'https://isda.co.in/'
            },
            {
              name: 'The Sleep Company',
              contact: 'support@thesleepcompany.in',
              description: 'Resources and recommendations for improving sleep quality',
              website: 'https://thesleepcompany.in/'
            },
            {
              name: 'Sleepiz India',
              contact: 'Contact via website',
              description: 'Platform for sleep health diagnostics and treatment',
              website: 'https://sleepiz.com.br/en/'
            }
          ]
        };
      case 'social':
        return {
          title: isHighSeverity ? 'Social Wellbeing Resources (India)' : 'Social Support Resources (India)',
          resources: [
            {
              name: 'YourDOST',
              contact: 'support@yourdost.com',
              description: 'Online counseling and emotional support platform',
              website: 'https://yourdost.com/'
            },
            {
              name: 'The Live Love Laugh Foundation',
              contact: 'Contact via website',
              description: 'Organization focused on reducing stigma around mental health',
              website: 'https://www.thelivelovelaughfoundation.org/'
            },
            {
              name: "It's Ok To Talk",
              contact: 'Contact via website',
              description: 'Youth-focused mental health engagement platform',
              website: 'http://itsoktotalk.in/'
            }
          ]
        };
      default:
        return {
          title: 'Mental Health Support Resources (India)',
          resources: [
            {
              name: 'National Mental Health Program',
              contact: '1800-599-0019',
              description: 'National toll-free helpline for mental health support',
              website: 'https://www.nhp.gov.in/national-mental-health-programme_pg'
            },
            {
              name: 'SPIF (Suicide Prevention India Foundation)',
              contact: 'Contact via website',
              description: 'Organization dedicated to suicide prevention',
              website: 'https://spif.in/'
            },
            {
              name: 'The Health Collective',
              contact: 'Contact via website',
              description: 'Mental health resource platform with India-specific information',
              website: 'https://healthcollective.in/'
            }
          ]
        };
    }
  };

  const { title, resources } = getCategorySpecificResources();

  return (
    <div className={`rounded-xl p-6 shadow-md mb-6 ${isHighSeverity ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
      <div className="flex items-center mb-4">
        {isHighSeverity ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <h3 className={`text-xl font-medium ${isHighSeverity ? 'text-red-700' : 'text-yellow-700'}`}>{title}</h3>
      </div>
      
      {isHighSeverity && (
        <div className="bg-red-100 p-4 rounded-lg mb-4 text-red-800">
          <p className="font-medium">If you're experiencing thoughts of self-harm or suicide, please seek immediate help.</p>
          <p className="mt-2">These are <strong>emergency</strong> resources in India that can provide immediate assistance:</p>
        </div>
      )}
      
      <ul className="space-y-4 mt-4">
        {resources.map((resource, index) => (
          <li key={index} className="border-b pb-3">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <h4 className="font-medium">{resource.name}</h4>
              <span className={`font-mono ${isHighSeverity ? 'text-red-600 font-bold' : 'text-yellow-600'} mt-1 sm:mt-0`}>{resource.contact}</span>
            </div>
            <p className="text-gray-600 text-sm mt-1">{resource.description}</p>
            <a 
              href={resource.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`text-sm mt-1 inline-block ${isHighSeverity ? 'text-red-600' : 'text-yellow-600'} hover:underline`}
            >
              Visit Website
            </a>
          </li>
        ))}
      </ul>
      
      <div className={`mt-5 text-sm ${isHighSeverity ? 'text-red-800' : 'text-yellow-800'}`}>
        <p className="font-medium">Important Information:</p>
        <p>This assessment is not a substitute for professional evaluation. If you're experiencing severe symptoms, please contact a mental health professional or visit the nearest hospital emergency department.</p>
        <p className="mt-2">For a comprehensive list of mental health resources in India, visit <a href="https://healthcollective.in/contact/helplines/" target="_blank" rel="noopener noreferrer" className="underline">The Health Collective India - Helplines</a>.</p>
      </div>
    </div>
  );
};

export default CrisisResources; 