"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Badge } from "@/components/ui/badge";
import { Section as SectionType } from "@/types/blocks/section";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function Feature3({ section }: { section: SectionType }) {
  const [activeTab, setActiveTab] = useState("");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  useEffect(() => {
    if (section.items && section.items.length > 0 && !activeTab) {
      setActiveTab("tab-1");
    }
  }, [section.items, activeTab]);

  if (section.disabled) {
    return null;
  }

  const stepVariants = {
    inactive: {
      scale: 1,
      y: 0,
    },
    active: {
      scale: 1.01,
      y: -1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 30,
      }
    },
    hover: {
      scale: 1.02,
      y: -2,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
      }
    }
  };

  const numberVariants = {
    inactive: {
      scale: 1,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      color: "rgb(107, 114, 128)",
    },
    active: {
      scale: 1.02,
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      color: "rgb(59, 130, 246)",
      borderColor: "rgba(59, 130, 246, 0.5)",
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 25,
      }
    },
    hover: {
      scale: 1.05,
      backgroundColor: "rgba(59, 130, 246, 0.15)",
      color: "rgb(59, 130, 246)",
      transition: {
        type: "spring",
        stiffness: 250,
        damping: 20,
      }
    }
  };

  const imageVariants = {
    enter: {
      opacity: 0,
      scale: 0.98,
      y: 10,
    },
    center: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 25,
        opacity: { duration: 0.3 }
      }
    },
    exit: {
      opacity: 0,
      scale: 1.02,
      y: -10,
      transition: {
        duration: 0.15
      }
    }
  };

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/10">
      <div className="container px-8">
        <div className="mb-16 max-w-xl px-8 lg:px-0 text-center mx-auto">
          {section.label && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Badge variant="outline" className="mb-4">
                {section.label}
              </Badge>
            </motion.div>
          )}
          <motion.h2 
            className="mb-6 text-pretty text-3xl font-bold lg:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {section.title}
          </motion.h2>
          <motion.p 
            className="mb-4 max-w-xl text-muted-foreground lg:max-w-none lg:text-lg"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {section.description}
          </motion.p>
        </div>
        
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="relative grid items-start gap-6 lg:grid-cols-4">
              {/* Subtle progress line */}
              <div className="absolute left-4 right-0 top-[32px] -z-10 hidden h-px bg-border/30 lg:block">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-300/50 to-purple-300/50"
                  initial={{ width: "25%" }}
                  animate={{ 
                    width: activeTab === "tab-1" ? "25%" : 
                           activeTab === "tab-2" ? "50%" : 
                           activeTab === "tab-3" ? "75%" : "100%"
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
              
              {section.items?.map((item, index) => {
                const tabValue = `tab-${index + 1}`;
                const isActive = activeTab === tabValue;
                const isHovered = hoveredTab === tabValue;
                
                return (
                  <motion.div
                    key={index}
                    variants={stepVariants}
                    animate={
                      isActive ? "active" : 
                      isHovered ? "hover" : "inactive"
                    }
                    onHoverStart={() => setHoveredTab(tabValue)}
                    onHoverEnd={() => setHoveredTab(null)}
                    className="relative"
                  >
                    <TabsTrigger
                      value={tabValue}
                      className="group w-full"
                      onClick={() => setActiveTab(tabValue)}
                    >
                      <motion.div 
                        className={`flex gap-4 rounded-lg px-6 py-4 text-left border transition-all duration-200 lg:block lg:px-4 ${
                          isActive 
                            ? "bg-muted/30 border-muted-foreground/20 shadow-sm" 
                            : "bg-background/50 border-border/50 hover:bg-muted/20 hover:border-muted-foreground/15"
                        }`}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex flex-col items-center lg:contents">
                          <motion.span 
                            className="flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-medium"
                            variants={numberVariants}
                            animate={
                              isActive ? "active" : 
                              isHovered ? "hover" : "inactive"
                            }
                          >
                            {index + 1}
                          </motion.span>
                          
                          {/* Connection line for mobile */}
                          <span className="h-full w-px bg-border/30 lg:hidden"></span>
                        </div>
                        
                        <div className="flex-1">
                          <motion.h3 
                            className={`mb-2 font-medium lg:mt-4 transition-colors duration-200 ${
                              isActive ? "text-blue-600/90" : "text-foreground"
                            }`}
                            animate={{ 
                              scale: isActive ? 1.01 : 1,
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            {item.title}
                          </motion.h3>
                          <motion.p 
                            className="text-sm text-muted-foreground leading-relaxed"
                            animate={{ 
                              opacity: isActive ? 1 : 0.85,
                              scale: isActive ? 1.01 : 1
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            {item.description}
                          </motion.p>
                        </div>
                      </motion.div>
                      
                    </TabsTrigger>
                  </motion.div>
                );
              })}
            </TabsList>
            
          </Tabs>
        </div>
      </div>
    </section>
  );
}
