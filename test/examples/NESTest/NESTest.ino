#include <NESpad.h>
#include <AccelStepper.h>
#include <rbl_nrf8001.h>

NESpad nintendo = NESpad(A1,A0,A2);
AccelStepper lstep(AccelStepper::FULL4WIRE, 5,3,4,2);
AccelStepper rstep(AccelStepper::FULL4WIRE, 13,11,12,10);

byte state = 0;
void setup() {
    lstep.setMaxSpeed(1000);
    rstep.setMaxSpeed(1000);
    lstep.setAcceleration(400.0);
    rstep.setAcceleration(400.0);



  Serial.begin(57600);
}

void loop() {

  state = nintendo.buttons();

  // shows the shifted bits from the joystick
  // buttons are high (1) when up
  // and low (0) when pressed
//  Serial.println(~state, BIN);
int speed = 40;
  if(state & NES_UP) {
    lstep.move(speed);
  }
  if(state & NES_DOWN) {
    lstep.move(-speed);
  }
  if(state & NES_LEFT) {
    rstep.move(speed);
  }
  if(state & NES_RIGHT) {
    rstep.move(-speed);
  }
   lstep.run();
   rstep.run();
  //delay(500);
}
