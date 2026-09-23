'use client';

import { useEffect, useState } from 'react';

// Extend Window interface to include Chart
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Chart: any;
  }
}

export default function ChartInitializer() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadChartJS = () => {
      return new Promise<void>((resolve) => {
        if (window.Chart) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = '/assets/js/plugins/chartjs.min.js';
        script.onload = () => {
          resolve();
        };
        document.head.appendChild(script);
      });
    };

    const initializeCharts = async () => {
      try {
        await loadChartJS();
        
        if (typeof window !== 'undefined' && window.Chart && !isLoaded) {
          setIsLoaded(true);
          
          // Website Views Chart (Bar Chart)
          const ctx1 = document.getElementById('chart-bars');
          if (ctx1) {
          new window.Chart(ctx1, {
            type: 'bar',
            data: {
              labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
              datasets: [{
                label: 'Views',
                tension: 0.4,
                borderWidth: 0,
                borderRadius: 4,
                borderSkipped: false,
                backgroundColor: '#43A047',
                data: [50, 45, 22, 28, 50, 60, 76],
                barThickness: 'flex'
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                }
              },
              interaction: {
                intersect: false,
                mode: 'index',
              },
              scales: {
                y: {
                  grid: {
                    drawBorder: false,
                    display: true,
                    drawOnChartArea: true,
                    drawTicks: false,
                    borderDash: [5, 5],
                    color: '#e5e5e5'
                  },
                  ticks: {
                    suggestedMin: 0,
                    suggestedMax: 500,
                    beginAtZero: true,
                    padding: 10,
                    font: {
                      size: 14,
                      weight: 300,
                      family: "Roboto",
                      style: 'normal',
                      lineHeight: 2
                    },
                    color: "#737373"
                  },
                },
                x: {
                  grid: {
                    drawBorder: false,
                    display: true,
                    drawOnChartArea: true,
                    drawTicks: false,
                    borderDash: [5, 5],
                    color: '#e5e5e5'
                  },
                  ticks: {
                    display: true,
                    color: '#737373',
                    padding: 10,
                    font: {
                      size: 14,
                      weight: 300,
                      family: "Roboto",
                      style: 'normal',
                      lineHeight: 2
                    },
                  }
                },
              },
            },
          });
        }

        // Daily Sales Chart (Line Chart)
        const ctx2 = document.getElementById('chart-line');
        if (ctx2) {
          new window.Chart(ctx2, {
            type: 'line',
            data: {
              labels: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
              datasets: [{
                label: 'Sales',
                tension: 0,
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#43A047',
                pointBorderColor: 'transparent',
                borderColor: '#43A047',
                backgroundColor: 'transparent',
                fill: true,
                data: [120, 230, 130, 440, 250, 360, 270, 180, 90, 300, 310, 220],
                maxBarThickness: 6
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
                tooltip: {
                  callbacks: {
                    title: function(context: { [index: number]: { dataIndex: number } }) {
                      const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                      return fullMonths[context[0].dataIndex];
                    }
                  }
                }
              },
              interaction: {
                intersect: false,
                mode: 'index',
              },
              scales: {
                y: {
                  grid: {
                    drawBorder: false,
                    display: true,
                    drawOnChartArea: true,
                    drawTicks: false,
                    borderDash: [5, 5],
                    color: '#e5e5e5'
                  },
                  ticks: {
                    display: true,
                    color: '#737373',
                    padding: 10,
                    font: {
                      size: 14,
                      weight: 300,
                      family: "Roboto",
                      style: 'normal',
                      lineHeight: 2
                    },
                  }
                },
                x: {
                  grid: {
                    drawBorder: false,
                    display: false,
                    drawOnChartArea: false,
                    drawTicks: false,
                    borderDash: [5, 5]
                  },
                  ticks: {
                    display: true,
                    color: '#f8f9fa',
                    padding: 10,
                    font: {
                      size: 14,
                      weight: 300,
                      family: "Roboto",
                      style: 'normal',
                      lineHeight: 2
                    },
                  }
                },
              },
            },
          });
        }

        // Completed Tasks Chart (Line Chart)
        const ctx3 = document.getElementById('chart-line-tasks');
        if (ctx3) {
          new window.Chart(ctx3, {
            type: 'line',
            data: {
              labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              datasets: [{
                label: 'Tasks',
                tension: 0,
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#43A047',
                pointBorderColor: 'transparent',
                borderColor: '#43A047',
                backgroundColor: 'transparent',
                fill: true,
                data: [50, 40, 300, 220, 500, 250, 400, 230, 500],
                maxBarThickness: 6
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                }
              },
              interaction: {
                intersect: false,
                mode: 'index',
              },
              scales: {
                y: {
                  grid: {
                    drawBorder: false,
                    display: true,
                    drawOnChartArea: true,
                    drawTicks: false,
                    borderDash: [4, 4],
                    color: '#e5e5e5'
                  },
                  ticks: {
                    display: true,
                    color: '#737373',
                    padding: 10,
                    font: {
                      size: 14,
                      lineHeight: 2
                    },
                  }
                },
                x: {
                  grid: {
                    drawBorder: false,
                    display: false,
                    drawOnChartArea: false,
                    drawTicks: false,
                    borderDash: [5, 5]
                  },
                  ticks: {
                    display: true,
                    color: '#f8f9fa',
                    padding: 10,
                    font: {
                      size: 14,
                      weight: 300,
                      family: "Roboto",
                      style: 'normal',
                      lineHeight: 2
                    },
                  }
                },
              },
            },
          });
          }
        }
      } catch (error) {
        console.error('Error initializing charts:', error);
      }
    };

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(initializeCharts, 500);
    
    return () => clearTimeout(timer);
  }, [isLoaded]);

  return null; // This component doesn't render anything
}